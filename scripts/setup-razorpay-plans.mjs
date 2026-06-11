// One-time setup: creates the two Pulse Plus plans in your Razorpay account and
// prints their IDs. Run it once after adding your Razorpay keys to .env.local:
//
//   node scripts/setup-razorpay-plans.mjs
//
// Then copy the two printed plan IDs into your env (RAZORPAY_PLAN_MONTHLY /
// RAZORPAY_PLAN_YEARLY). Safe to re-run — it just makes new plans; old ones are
// harmless. Prices are in paise (₹1 = 100 paise): ₹99 = 9900, ₹799 = 79900.
import { readFileSync } from 'node:fs';
import Razorpay from 'razorpay';

// Load .env.local without any extra dependency.
function loadEnv() {
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* no .env.local — rely on real env */ }
}
loadEnv();

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;
if (!key_id || !key_secret) {
  console.error('\n✗ Missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env.local\n');
  process.exit(1);
}

const razorpay = new Razorpay({ key_id, key_secret });

const PLANS = [
  { key: 'RAZORPAY_PLAN_MONTHLY', period: 'monthly', interval: 1, name: 'Pulse Plus — Monthly', amount: 9900 },
  { key: 'RAZORPAY_PLAN_YEARLY',  period: 'yearly',  interval: 1, name: 'Pulse Plus — Yearly',  amount: 79900 },
];

console.log('\nCreating Pulse Plus plans in', key_id.startsWith('rzp_test') ? 'TEST mode' : 'LIVE mode', '…\n');

for (const p of PLANS) {
  try {
    const plan = await razorpay.plans.create({
      period: p.period,
      interval: p.interval,
      item: { name: p.name, amount: p.amount, currency: 'INR', description: 'Pulse Plus subscription' },
    });
    console.log(`✓ ${p.name}\n  ${p.key}=${plan.id}\n`);
  } catch (e) {
    console.error(`✗ ${p.name} failed:`, e?.error?.description || e?.message || e, '\n');
  }
}

console.log('Paste the two lines above into your env (.env.local and Vercel). Done.\n');
