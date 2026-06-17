// Pulse Sparks — the engagement economy. ⚡ Sparks are EARNED purely from a
// user's own logged data (the same honesty rule the badges follow) and SPENT in
// the Shop. The wallet is *reconciled* from real state on every change, with a
// claims ledger so nothing is ever double-credited and editing a past day later
// pays out the difference. Plus members earn 1.5×; a Double-Sparks boost stacks
// 2× on top for 24h. Real-money top-ups (Razorpay) are added in a later wave.

import { goalsHit } from './score.js';
import { resolveBadges } from './badges.js';
import { currentStreak } from './streak.js';
import { isPlus } from './plan.js';
import { getDay } from './storage.js';
import { todayKey } from './dates.js';

export const SPARK = '⚡';

// ---- EARN RULES (the faucet) — tuned so an engaged day ≈ 45–65 Sparks, a
// casual day ≈ 15–25, and the first nice cosmetic lands in ~4–6 days. ----
export const EARN = {
  perMetric: 3,     // first time each core metric is logged in a day (×7)
  completeDay: 15,  // every core metric logged in one day
  perGoal: 4,       // each pillar goal hit (×5)
  perfectDay: 25,   // every goal hit in one day
  streakPerDay: 1,  // × current streak, credited once per day
  streakCap: 15,    // streak kicker tops out here
  badgeMult: 5,     // a badge pays weight × this (25 → 500 Sparks)
  onboard: 50,      // finishing setup, once
};

export const PLUS_MULT = 1.5;   // Plus is a Spark accelerator
export const BOOST_MULT = 2;    // Double-Sparks Day, stacks on Plus
export const FREEZE_MAX = 3;    // streak freezes you can hold at once

// Core metrics that make up a "complete day". Journal is a nice-to-have extra
// that still earns per-metric Sparks but isn't required for the bonus.
const CORE = ['water', 'steps', 'sleep', 'mood', 'meal', 'workout'];

function logged(d) {
  return {
    water:   (d.water || 0) > 0,
    steps:   (d.steps || 0) > 0,
    sleep:   d.sleep != null,
    mood:    d.mood != null,
    meal:    (d.meals || []).length > 0,
    workout: (d.workouts || []).length > 0,
    journal: !!(d.moodNote && d.moodNote.trim()),
  };
}

// The unmultiplied Sparks a single day's data is *worth*. Pure function of the
// day + goals, so re-running it is safe and the claims ledger can diff against it.
function baseEarnForDay(day, goals) {
  const m = logged(day);
  let s = Object.values(m).filter(Boolean).length * EARN.perMetric;
  if (CORE.every((k) => m[k])) s += EARN.completeDay;
  const gh = goalsHit(day, goals);
  s += gh.hit * EARN.perGoal;
  if (gh.total > 0 && gh.hit === gh.total) s += EARN.perfectDay;
  return s;
}

// The live earn multiplier (Plus × active boost). Read at credit time, so it
// only ever applies to *new* earning — flipping Plus on doesn't retro-pay history.
export function liveMultiplier(state, plus) {
  const isP = plus != null ? plus : isPlus(state.settings);
  const boosted = boostActive(state.wallet);
  return (isP ? PLUS_MULT : 1) * (boosted ? BOOST_MULT : 1);
}

export function boostActive(wallet) {
  return !!(wallet?.boostUntil && Date.now() < wallet.boostUntil);
}

// Reconcile the wallet against the user's real data. Idempotent: returns the
// SAME wallet reference when nothing new was earned (so the effect can bail and
// never loops). `credited` reports how many Sparks this pass added, for a toast.
export function reconcileWallet(state, plus) {
  const w = state.wallet;
  if (!w) return { wallet: state.wallet, credited: 0 };

  const mult = liveMultiplier(state, plus);
  const claims = {
    days: { ...(w.claims?.days || {}) },
    badges: [...(w.claims?.badges || [])],
    streakDay: w.claims?.streakDay ?? null,
    onboard: !!w.claims?.onboard,
    payments: [...(w.claims?.payments || [])],  // preserve credited-payment dedup list
  };
  let credit = 0;
  let changed = false;

  // Per-day earns — diff what each day is worth against what it has already paid.
  const days = state.days || {};
  for (const key of Object.keys(days)) {
    const should = baseEarnForDay(getDay(state, key), state.goals);
    const prev = claims.days[key] || 0;
    if (should > prev) { credit += (should - prev) * mult; claims.days[key] = should; changed = true; }
  }

  // Achievement payouts — each earned badge pays once, scaled by its rarity weight.
  const { badges } = resolveBadges(state);
  for (const b of badges) {
    if (b.earned && !claims.badges.includes(b.id)) {
      credit += b.weight * EARN.badgeMult * mult;
      claims.badges.push(b.id);
      changed = true;
    }
  }

  // One-time onboarding bonus.
  if (state.settings?.onboarded && !claims.onboard) {
    credit += EARN.onboard * mult;
    claims.onboard = true;
    changed = true;
  }

  // Streak kicker — once per calendar day, rewards an active streak (retention).
  const tk = todayKey();
  if (claims.streakDay !== tk) {
    const st = currentStreak(state);
    if (st > 0) {
      credit += Math.min(EARN.streakCap, st) * EARN.streakPerDay * mult;
      claims.streakDay = tk;
      changed = true;
    }
  }

  if (!changed) return { wallet: w, credited: 0 };
  const add = Math.round(credit);
  return {
    wallet: { ...w, balance: w.balance + add, earned: w.earned + add, claims },
    credited: add,
  };
}

// ============================================================
//  THE SHOP — every shelf, priced against the earn rates above.
// ============================================================

// Accent themes re-skin the whole app (brand, buttons, ring) via a `data-accent`
// attribute (see styles/shop.css). One-time cosmetic; owned forever once bought.
export const ACCENTS = [
  { id: 'accent-honey',  value: 'honey',  name: 'Honey',         emoji: '🍯', price: 0,   swatch: '#E89414', free: true },
  { id: 'accent-ocean',  value: 'ocean',  name: 'Ocean',         emoji: '🌊', price: 300, swatch: '#1E88C9' },
  { id: 'accent-forest', value: 'forest', name: 'Forest',        emoji: '🌲', price: 320, swatch: '#2E9E5B' },
  { id: 'accent-sunset', value: 'sunset', name: 'Sunset',        emoji: '🌅', price: 340, swatch: '#EF6C42' },
  { id: 'accent-rose',   value: 'rose',   name: 'Rosé',          emoji: '🌸', price: 340, swatch: '#E0567E' },
  { id: 'accent-grape',  value: 'grape',  name: 'Grape',         emoji: '🍇', price: 360, swatch: '#8A5CD0' },
  { id: 'accent-mono',   value: 'mono',   name: 'Graphite',      emoji: '⚫', price: 280, swatch: '#5C6470' },
  { id: 'accent-midnight', value: 'midnight', name: 'Midnight Neon', emoji: '💠', price: 500, swatch: '#00E5C7', plus: true },
];

// Badge frames wrap your earned medals in the Badges tab.
export const FRAMES = [
  { id: 'frame-none', value: 'none', name: 'No frame', emoji: '⬜', price: 0, free: true },
  { id: 'frame-gold', value: 'gold', name: 'Gold Frame', emoji: '🟡', price: 400 },
  { id: 'frame-holo', value: 'holo', name: 'Holographic', emoji: '🌈', price: 650, plus: true },
];

// Nameplates show a flair next to your name in the header.
export const NAMEPLATES = [
  { id: 'np-none',   value: '',   name: 'None',    emoji: '—',  price: 0, free: true },
  { id: 'np-sprout', value: '🌱', name: 'Sprout',  emoji: '🌱', price: 150 },
  { id: 'np-flame',  value: '🔥', name: 'On Fire', emoji: '🔥', price: 200 },
  { id: 'np-star',   value: '🌟', name: 'Star',    emoji: '🌟', price: 300 },
  { id: 'np-crown',  value: '👑', name: 'Royalty', emoji: '👑', price: 600, plus: true },
];

// Consumables & boosts — the recurring sinks that keep the economy alive after
// someone owns every cosmetic.
export const CONSUMABLES = [
  { id: 'freeze',   name: 'Streak Freeze', emoji: '🧊', price: 150, kind: 'freeze',
    desc: 'Protects your streak through one missed day. Hold up to 3.' },
  { id: 'boost-2x', name: 'Double Sparks Day', emoji: '⚡', price: 120, kind: 'boost',
    desc: 'Earn 2× Sparks on everything for the next 24 hours.' },
];

// A flat lookup of everything purchasable, for validating a buy.
export const SHOP_INDEX = Object.fromEntries(
  [...ACCENTS, ...FRAMES, ...NAMEPLATES, ...CONSUMABLES].map((i) => [i.id, i])
);

// Real-money Spark packs (Razorpay). `amount` is in paise — the *authoritative*
// price lives server-side (api/create-spark-order.js); these are for display and
// for the order request. Value-per-rupee rises at higher tiers, the usual ladder.
export const SPARK_PACKS = [
  { id: 'pack-s',  sparks: 500,  price: '₹49',  amount: 4900,  emoji: '✨', name: 'Pouch' },
  { id: 'pack-m',  sparks: 1200, price: '₹99',  amount: 9900,  emoji: '💫', name: 'Sack',  tag: 'Popular' },
  { id: 'pack-l',  sparks: 2800, price: '₹199', amount: 19900, emoji: '🌟', name: 'Chest', tag: 'Best value' },
  { id: 'pack-xl', sparks: 6500, price: '₹399', amount: 39900, emoji: '🏆', name: 'Vault' },
];
export const PACK_INDEX = Object.fromEntries(SPARK_PACKS.map((p) => [p.id, p]));

// Slot each cosmetic equips into (drives the "Equipped" state + apply effects).
export function slotOf(item) {
  if (item.id.startsWith('accent-')) return 'accent';
  if (item.id.startsWith('frame-')) return 'frame';
  if (item.id.startsWith('np-')) return 'nameplate';
  return null;
}
