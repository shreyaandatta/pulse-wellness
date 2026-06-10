// Date helpers — all local-time, no timezone surprises.

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

export function lastNDays(n, end = todayKey()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function weekdayShort(key) { return WD[keyToDate(key).getDay()]; }
export function dayNum(key) { return keyToDate(key).getDate(); }

export function prettyDate(key) {
  const d = keyToDate(key);
  return `${WD[d.getDay()]}, ${MO[d.getMonth()].slice(0,3)} ${d.getDate()}`;
}

export function isToday(key) { return key === todayKey(); }

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
