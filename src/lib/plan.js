// Pulse Plus — the plan layer. The plan flag lives in settings so it persists
// per-account and rides the existing cloud sync. There's no payment processor
// wired up yet: upgrading activates Plus directly (an honest demo checkout),
// so the whole experience can be exercised end-to-end.

export const FREE_HISTORY_DAYS = 21;   // free plan sees this many days back
export const FREE_CONNECTIONS = 4;     // free plan's friends/family cap
export const MAX_TRACKERS = 6;         // custom trackers per account (Plus)

// Pricing is in INR (Razorpay). Yearly ≈ 8 months' worth, so it saves ~33%.
export const PLUS_PRICE = { monthly: '₹99', yearly: '₹799', yearlySave: '33%' };

export function isPlus(settings) {
  return settings?.plan === 'plus';
}

// The pitch, in one place — the paywall modal and the Settings card both read it.
export const PLUS_PERKS = [
  { emoji: '📈', title: 'Your whole history', desc: `All-time trends and charts — free shows the last ${FREE_HISTORY_DAYS} days.` },
  { emoji: '🎁', title: 'Year in review', desc: 'A beautiful look back at any year you\'ve tracked.' },
  { emoji: '🧩', title: 'Custom trackers', desc: 'Track anything — meditation, reading, screen time, you name it.' },
  { emoji: '👨‍👩‍👧', title: 'Family', desc: 'Start a household and see your kids\' steps, meals, protein, workouts and mood. Members join free.' },
  { emoji: '👥', title: 'Unlimited friends', desc: `Connect with everyone — free includes ${FREE_CONNECTIONS} connections.` },
  { emoji: '📊', title: 'Spreadsheet export', desc: 'Download your full history as a CSV for any spreadsheet app.' },
  { emoji: '🚫', title: 'No ads', desc: 'A calm, ad-free Pulse — the free plan is supported by the odd sponsored slot.' },
];
