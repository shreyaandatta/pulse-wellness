// On-device accounts. Honest about what it is: there's no server, so accounts
// live in this browser's localStorage. Passwords are never stored in the clear —
// they're hashed with PBKDF2 (SHA-256, 150k iterations) via the Web Crypto API,
// the same primitive real auth systems use. The trade-off is that everything is
// local: no cross-device sync, and someone with full access to this machine
// could clear the store. It protects against casual snooping, not a forensic
// attacker. Good enough for a private, single-device wellness journal.

const ACCOUNTS_KEY = 'pulse.accounts.v1';
const SESSION_KEY = 'pulse.session';
const ITERATIONS = 150000;

// ---- hex helpers -------------------------------------------------------
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));

// ---- password hashing (PBKDF2) ----------------------------------------
async function derive(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base, 256);
  return toHex(bits);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { saltHex: toHex(salt), hashHex: await derive(password, salt) };
}

// constant-time-ish string compare
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// ---- account store -----------------------------------------------------
function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || { users: {} }; }
  catch { return { users: {} }; }
}
function saveAccounts(data) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(data)); } catch {}
}

export const normId = (username) => String(username || '').trim().toLowerCase();

export function accountExists(username) {
  return !!loadAccounts().users[normId(username)];
}

export function listAccounts() {
  return Object.values(loadAccounts().users).map((u) => ({ id: u.id, name: u.name }));
}

// Returns { id, name } on success, or throws a friendly Error.
export async function createAccount(name, username, password) {
  const id = normId(username);
  if (id.length < 3) throw new Error('Pick a username with at least 3 characters.');
  if (!/^[a-z0-9_.-]+$/.test(id)) throw new Error('Usernames can use letters, numbers, and . _ - only.');
  if (password.length < 6) throw new Error('Use a password of at least 6 characters.');
  const store = loadAccounts();
  if (store.users[id]) throw new Error('That username is already taken on this device.');
  const { saltHex, hashHex } = await hashPassword(password);
  store.users[id] = { id, name: name.trim() || username.trim(), saltHex, hashHex, createdAt: Date.now() };
  saveAccounts(store);
  return { id, name: store.users[id].name };
}

// Returns { id, name } on success, or throws a friendly Error.
export async function verifyCredentials(username, password) {
  const id = normId(username);
  const user = loadAccounts().users[id];
  if (!user) throw new Error("No account with that username on this device.");
  const attempt = await derive(password, fromHex(user.saltHex));
  if (!safeEqual(attempt, user.hashHex)) throw new Error('That password doesn\'t match. Try again.');
  return { id: user.id, name: user.name };
}

// ---- session -----------------------------------------------------------
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s?.id === 'guest') return { id: 'guest', name: 'Guest', guest: true };
    const user = loadAccounts().users[s?.id];
    return user ? { id: user.id, name: user.name } : null;
  } catch { return null; }
}

export function setSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ id: session.id })); } catch {}
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}
