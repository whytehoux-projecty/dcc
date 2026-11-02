import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { dataFile, readJSON, writeJSON, audit } from './store.js';

const scrypt = promisify(crypto.scrypt);
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SESSION_ABSOLUTE = 12 * 3600e3, SESSION_IDLE = 2 * 3600e3;

async function hash(password, salt = crypto.randomBytes(16)) {
  const key = await scrypt(password, salt, 64, SCRYPT);
  return { salt: salt.toString('hex'), hash: key.toString('hex') };
}
async function verify(password, rec) {
  const key = await scrypt(password, Buffer.from(rec.salt, 'hex'), 64, SCRYPT);
  const want = Buffer.from(rec.hash, 'hex');
  return key.length === want.length && crypto.timingSafeEqual(key, want);
}

const users = () => readJSON(dataFile('users.json'), []);
const saveUsers = (u) => writeJSON(dataFile('users.json'), u);
export const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, mustChange: !!u.mustChange });

export function passwordProblem(p) {
  if (typeof p !== 'string' || p.length < 12) return 'Use at least 12 characters.';
  if (p.length > 200) return 'Use at most 200 characters.';
  if (!/[a-z]/i.test(p) || !/[0-9]/.test(p)) return 'Include letters and at least one number.';
  if (/^(password|12345678|qwerty)/i.test(p)) return 'That password is too easy to guess.';
  return '';
}

// Creates the first administrator if none exist. Returns the one-time password when it was generated.
export async function ensureAdmin() {
  if (users().length) return null;
  const given = process.env.ADMIN_PASSWORD;
  const password = given || crypto.randomBytes(12).toString('base64url');
  const username = (process.env.ADMIN_USER || 'admin').toLowerCase();
  const u = { id: crypto.randomUUID(), username, name: 'Site administrator', role: 'admin', ...(await hash(password)), mustChange: !given, createdAt: new Date().toISOString() };
  saveUsers([u]); audit('system', 'first-admin-created', username);
  return given ? null : { username, password };
}

// ---- login throttling (per account+address, plus per address) ----
const fails = new Map();
const bump = (k) => { const e = fails.get(k) || { n: 0, until: 0, t: Date.now() }; if (Date.now() - e.t > 15 * 60e3) { e.n = 0; e.t = Date.now(); } e.n++; if (e.n >= 5) e.until = Date.now() + 15 * 60e3; fails.set(k, e); };
const locked = (k) => { const e = fails.get(k); return e && e.until > Date.now() ? Math.ceil((e.until - Date.now()) / 60e3) : 0; };
export function resetThrottle() { fails.clear(); }

export async function login(username, password, ip, ua) {
  const uname = String(username || '').toLowerCase().trim().slice(0, 80);
  const k1 = `u:${uname}:${ip}`, k2 = `ip:${ip}`;
  const wait = Math.max(locked(k1), locked(k2));
  if (wait) return { error: `Too many attempts. Try again in ${wait} minute${wait > 1 ? 's' : ''}.`, status: 429 };
  const u = users().find(x => x.username === uname);
  // Always spend the same hashing time, whether or not the account exists.
  const ok = u ? await verify(String(password || ''), u) : (await hash(String(password || ''), Buffer.alloc(16)), false);
  if (!ok) { bump(k1); if ((fails.get(k2)?.n || 0) < 20) bump(k2); audit(uname || '?', 'login-failed', ip); return { error: 'That username and password do not match.', status: 401 }; }
  fails.delete(k1);
  const token = crypto.randomBytes(32).toString('base64url');
  const s = { user: u.id, csrf: crypto.randomBytes(18).toString('base64url'), created: Date.now(), last: Date.now(), ip, ua: String(ua || '').slice(0, 120) };
  sessions.set(sha(token), s); persist();
  audit(u.username, 'login', ip);
  return { token, session: s, user: publicUser(u) };
}

// ---- sessions (hashed at rest; survive restarts) ----
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const sessions = new Map(Object.entries(readJSON(dataFile('sessions.json'), {})));
function persist() { writeJSON(dataFile('sessions.json'), Object.fromEntries(sessions)); }
export function sessionFor(token) {
  if (!token) return null;
  const key = sha(token), s = sessions.get(key);
  if (!s) return null;
  const now = Date.now();
  if (now - s.created > SESSION_ABSOLUTE || now - s.last > SESSION_IDLE) { sessions.delete(key); persist(); return null; }
  const u = users().find(x => x.id === s.user);
  if (!u) { sessions.delete(key); persist(); return null; }
  if (now - s.last > 60e3) { s.last = now; persist(); }
  return { s, user: u };
}
export function logout(token) { if (token) { sessions.delete(sha(token)); persist(); } }
function dropSessionsFor(uid, keepKey) { for (const [k, s] of sessions) if (s.user === uid && k !== keepKey) sessions.delete(k); persist(); }

export async function changePassword(userId, current, next, token) {
  const all = users(), u = all.find(x => x.id === userId);
  if (!u || !(await verify(String(current || ''), u))) return 'The current password is not correct.';
  const problem = passwordProblem(next); if (problem) return problem;
  Object.assign(u, await hash(next), { mustChange: false }); saveUsers(all);
  dropSessionsFor(u.id, token ? sha(token) : null); audit(u.username, 'password-changed');
  return '';
}

export const listUsers = () => users().map(publicUser);
export async function createUser(by, { username, name, role, password }) {
  const all = users();
  const uname = String(username || '').toLowerCase().trim();
  if (!/^[a-z0-9._-]{3,32}$/.test(uname)) return { error: 'Username: 3–32 letters, numbers, dot, dash or underscore.' };
  if (all.some(x => x.username === uname)) return { error: 'That username is taken.' };
  if (!['admin', 'editor'].includes(role)) return { error: 'Choose a role.' };
  const problem = passwordProblem(password); if (problem) return { error: problem };
  const u = { id: crypto.randomUUID(), username: uname, name: String(name || uname).trim().slice(0, 60), role, ...(await hash(password)), mustChange: true, createdAt: new Date().toISOString() };
  all.push(u); saveUsers(all); audit(by, 'user-created', uname);
  return { user: publicUser(u) };
}
export async function resetUser(by, id, password) {
  const all = users(), u = all.find(x => x.id === id); if (!u) return 'No such user.';
  const problem = passwordProblem(password); if (problem) return problem;
  Object.assign(u, await hash(password), { mustChange: true }); saveUsers(all); dropSessionsFor(u.id); audit(by, 'password-reset', u.username); return '';
}
export function deleteUser(by, id) {
  const all = users(), u = all.find(x => x.id === id); if (!u) return 'No such user.';
  if (u.role === 'admin' && all.filter(x => x.role === 'admin').length < 2) return 'There must be at least one administrator.';
  saveUsers(all.filter(x => x.id !== id)); dropSessionsFor(id); audit(by, 'user-deleted', u.username); return '';
}
