// Client side of Razorpay billing. Talks only to our own /api functions and the
// Razorpay Checkout script — never touches a secret key. Stays inert (so the app
// keeps its demo upgrade) unless VITE_RAZORPAY_KEY_ID is set at build time.
import { supabase } from './supabase.js';

// The key id is publishable (safe in the browser); its presence is our signal
// that real billing is wired up.
export const hasRazorpay = Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID);

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

// Load Razorpay Checkout once, on demand.
function loadCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', reject); return; }
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
    document.head.appendChild(s);
  });
}

// Call one of our authenticated endpoints with the current access token.
async function api(path, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Please sign in to manage your plan.');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}

// Full upgrade flow: create a subscription, then open Razorpay Checkout. Resolves
// when the user authorizes payment (the webhook then grants Plus server-side).
export async function startSubscription(plan, { email, name } = {}) {
  const [{ subscriptionId, keyId }] = await Promise.all([
    api('/api/create-subscription', { plan }),
    loadCheckout(),
  ]);

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      subscription_id: subscriptionId,
      name: 'Pulse Plus',
      description: plan === 'yearly' ? 'Yearly subscription' : 'Monthly subscription',
      theme: { color: '#E89414' },
      prefill: { email: email || '', name: name || '' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error('cancelled')) },
    });
    rzp.on('payment.failed', (resp) => reject(new Error(resp?.error?.description || 'Payment failed.')));
    rzp.open();
  });
}

export async function cancelSubscription() {
  return api('/api/cancel-subscription', {});
}

// One-time Spark-pack purchase. Creates a Razorpay Order, opens Checkout, then
// has our server verify the payment signature. Resolves with the verified
// { sparks, paymentId } so the caller can credit the wallet exactly once.
export async function buySparks(pack, { email, name } = {}) {
  const [{ orderId, amount, currency, keyId }] = await Promise.all([
    api('/api/create-spark-order', { pack }),
    loadCheckout(),
  ]);

  const payment = await new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      amount,
      currency: currency || 'INR',
      name: 'Pulse — Sparks',
      description: `${pack} Spark pack`,
      theme: { color: '#E89414' },
      prefill: { email: email || '', name: name || '' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error('cancelled')) },
    });
    rzp.on('payment.failed', (resp) => reject(new Error(resp?.error?.description || 'Payment failed.')));
    rzp.open();
  });

  // Server is the source of truth for how many Sparks the pack is worth and that
  // the payment is genuine; the browser only relays Razorpay's response.
  const verified = await api('/api/verify-spark-order', {
    pack,
    orderId: payment.razorpay_order_id,
    paymentId: payment.razorpay_payment_id,
    signature: payment.razorpay_signature,
  });
  // The server credited the wallet; it returns the fresh authoritative copy.
  return { sparks: verified.sparks, wallet: verified.wallet, paymentId: payment.razorpay_payment_id };
}
