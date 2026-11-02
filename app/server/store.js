import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DEFAULTS, sanitizeAll } from './schema.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(here, '..');
export const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
export const MEDIA_DIR = path.join(DATA, 'media');
const REV_DIR = path.join(DATA, 'revisions');

const f = (n) => path.join(DATA, n);
export function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
export function writeJSON(file, data) {
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}
const clone = (o) => JSON.parse(JSON.stringify(o));

let state = null;
export function init() {
  fs.mkdirSync(MEDIA_DIR, { recursive: true, mode: 0o700 });
  fs.mkdirSync(REV_DIR, { recursive: true, mode: 0o700 });
  // Seed photography on first run only.
  const seedDir = path.join(ROOT, 'seed');
  if (!fs.existsSync(f('media.json'))) {
    const seeded = readJSON(path.join(seedDir, 'media.json'), []);
    for (const m of seeded) {
      for (const w of m.widths) for (const ext of ['avif', 'webp', 'jpg']) {
        const src = path.join(seedDir, 'media', `${m.id}-${w}.${ext}`);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(MEDIA_DIR, `${m.id}-${w}.${ext}`));
      }
    }
    writeJSON(f('media.json'), seeded.map(m => ({ ...m, added: new Date().toISOString() })));
  }
  const published = sanitizeAll(readJSON(f('published.json'), DEFAULTS), DEFAULTS);
  const draft = fs.existsSync(f('draft.json')) ? sanitizeAll(readJSON(f('draft.json'), published), published) : clone(published);
  state = { published, draft, media: readJSON(f('media.json'), []), publishedAt: readJSON(f('meta.json'), {}).publishedAt || null };
  if (!fs.existsSync(f('published.json'))) writeJSON(f('published.json'), published);
  return state;
}
const S = () => state || init();

export const getPublished = () => S().published;
export const getDraft = () => S().draft;
export const getMedia = () => S().media;
export const publishedAt = () => S().publishedAt;
export const hasChanges = () => JSON.stringify(S().draft) !== JSON.stringify(S().published);

let listeners = [];
export const onPublish = (fn) => listeners.push(fn);

export function saveDraftPage(pageId, pageData) {
  if (!(pageId in DEFAULTS)) throw httpError(404, 'Unknown page');
  const next = sanitizeAll({ ...S().draft, [pageId]: pageData }, S().draft);
  S().draft = next; writeJSON(f('draft.json'), next);
  return next[pageId];
}
export function setDraftAll(all) {
  S().draft = sanitizeAll(all, S().published); writeJSON(f('draft.json'), S().draft);
}
export function discardDraft() { S().draft = clone(S().published); writeJSON(f('draft.json'), S().draft); }

export function publish(by, note = '') {
  const s = S();
  // Snapshot what is being replaced, so any publish can be undone.
  const id = new Date().toISOString().replace(/[:.]/g, '-');
  writeJSON(path.join(REV_DIR, `${id}.json`), { id, by, note: String(note).slice(0, 200), at: new Date().toISOString(), content: s.draft });
  pruneRevisions();
  s.published = clone(s.draft);
  s.publishedAt = new Date().toISOString();
  writeJSON(f('published.json'), s.published);
  writeJSON(f('meta.json'), { publishedAt: s.publishedAt });
  listeners.forEach(fn => fn());
  return id;
}
function pruneRevisions() {
  const files = fs.readdirSync(REV_DIR).filter(n => n.endsWith('.json')).sort();
  for (const n of files.slice(0, Math.max(0, files.length - 60))) fs.rmSync(path.join(REV_DIR, n), { force: true });
}
export function listRevisions() {
  return fs.readdirSync(REV_DIR).filter(n => n.endsWith('.json')).sort().reverse().slice(0, 40)
    .map(n => { const r = readJSON(path.join(REV_DIR, n), null); return r && { id: r.id, by: r.by, note: r.note, at: r.at }; }).filter(Boolean);
}
export function getRevision(id) {
  if (!/^[0-9TZ-]+$/.test(id)) return null;
  return readJSON(path.join(REV_DIR, `${id}.json`), null);
}

// ---- media ----
export function saveMediaIndex() { writeJSON(f('media.json'), S().media); }
export function addMedia(rec) { S().media.unshift(rec); saveMediaIndex(); return rec; }
export function findMedia(id) { return S().media.find(m => m.id === id); }
export function removeMedia(id) {
  const m = findMedia(id); if (!m) return false;
  for (const name of fs.readdirSync(MEDIA_DIR)) if (name.startsWith(id + '-') || name === m.file) fs.rmSync(path.join(MEDIA_DIR, name), { force: true });
  S().media = S().media.filter(x => x.id !== id); saveMediaIndex(); return true;
}
export function mediaUsage(id) {
  const hits = [];
  const walk = (node, trail, where) => {
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${trail}[${i}]`, where));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${trail}.${k}`, where);
    else if (node === id) hits.push(`${where}: ${trail.replace(/^\./, '')}`);
  };
  walk(S().draft, '', 'draft'); walk(S().published, '', 'live');
  return hits;
}

// ---- enquiries ----
export const readEnquiries = () => readJSON(f('enquiries.json'), []);
export const writeEnquiries = (list) => writeJSON(f('enquiries.json'), list);

// ---- audit ----
export function audit(user, action, detail = '') {
  const line = JSON.stringify({ at: new Date().toISOString(), user, action, detail: String(detail).slice(0, 200) });
  fs.appendFileSync(f('audit.log'), line + '\n', { mode: 0o600 });
}
export function readAudit(n = 80) {
  try { return fs.readFileSync(f('audit.log'), 'utf8').trim().split('\n').slice(-n).reverse().map(l => JSON.parse(l)); } catch { return []; }
}

export function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
export const dataFile = f;
