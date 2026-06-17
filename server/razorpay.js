// Shared server-side helpers for the billing functions. This file is imported
// only by the serverless functions in /api — never by the browser bundle — so
// it's the one place secret keys are allowed to live (read from env at runtime).
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  RAZORPAY_PLAN_MONTHLY,
  RAZORPAY_PLAN_YEARLY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

export const KEY_ID = RAZORPAY_KEY_ID;
export const WEBHOOK_SECRET = RAZORPAY_WEBHOOK_SECRET;
export const PLAN_IDS = { monthly: RAZORPAY_PLAN_MONTHLY, yearly: RAZORPAY_PLAN_YEARLY };

// Authoritative Spark-pack pricing — paise charged + Sparks granted. The browser
// only names a pack id; it can never set its own price or payout. Mirror of the
// display catalogue in src/lib/economy.js (SPARK_PACKS).
export const SPARK_PACKS = {
  'pack-s':  { amount: 4900,  sparks: 500 },
  'pack-m':  { amount: 9900,  sparks: 1200 },
  'pack-l':  { amount: 19900, sparks: 2800 },
  'pack-xl': { amount: 39900, sparks: 6500 },
};

// Verify a one-time Order payment: Razorpay signs `orderId|paymentId` with the
// key secret. Constant-time compare, mirroring verifySignature for webhooks.
export function verifyOrderPayment(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature || !RAZORPAY_KEY_SECRET) return false;
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// True only when every secret needed to actually charge is present. The
// functions return a clear 503 otherwise, and the frontend stays in demo mode.
export const billingConfigured = Boolean(
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
);

export const razorpay = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

// Service-role client — bypasses Row Level Security so the webhook can write the
// entitlements table that users themselves are only allowed to read.
export const adminDb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Validate the caller's Supabase access token and return their user (or null).
// This is how a function knows *which* account is buying, without trusting the
// browser to tell it.
export async function getUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !adminDb) return null;
  try {
    const { data, error } = await adminDb.auth.getUser(token);
    if (error) return null;
    return data.user || null;
  } catch {
    return null;
  }
}

// Read the request body as a string. Prefers an already-parsed body, else drains
// the stream. The webhook needs the *exact* bytes Razorpay signed, so it disables
// body parsing and relies on the stream branch here.
export async function getRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// JSON body for our own endpoints (object if pre-parsed, else parse the stream).
export async function getJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = await getRawBody(req);
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

// Constant-time check that a webhook really came from Razorpay.
export function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
