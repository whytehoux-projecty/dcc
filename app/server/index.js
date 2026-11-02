import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as store from './store.js';
import * as auth from './auth.js';
import { PAGES, DEFAULTS, sanitize } from './schema.js';
import { renderPage, PUBLIC_PATHS } from './render.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '../public');
const ADMIN_DIR = path.join(here, '../admin');
const ADMIN = ('/' + (process.env.ADMIN_PATH || 'admin').replace(/^\/+|\/+$/g, '')).replace(/[^a-zA-Z0-9/_-]/g, '');
const COOKIE = 'dc_staff';

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const COMPRESSIBLE = /^(text\/|application\/(json|xml)|image\/svg)/;

const PUBLIC_CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; style-src-attr 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'";
const baseHeaders = () => ({
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()', 'Cross-Origin-Opener-Policy': 'same-origin',
});

function send(req, res, status, body, headers = {}) {
  const h = { ...baseHeaders(), ...headers };
  const type = h['Content-Type'] || '';
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  if (COMPRESSIBLE.test(type) && buf.length > 900 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    buf = zlib.gzipSync(buf, { level: 6 }); h['Content-Encoding'] = 'gzip'; h.Vary = 'Accept-Encoding';
  }
  h['Content-Length'] = buf.length;
  res.writeHead(status, h); res.end(req.method === 'HEAD' ? undefined : buf);
}
const json = (req, res, status, obj, extra = {}) => send(req, res, status, JSON.stringify(obj), { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', ...extra });
const fail = (req, res, status, message) => json(req, res, status, { error: message });

function ip(req) { return (process.env.TRUST_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress || '?'; }
function isHttps(req) { return !!process.env.TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === '1'; }
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(store.httpError(413, 'That file is too large.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject);
  });
}
async function readJSON(req, limit = 512 * 1024) {
  const b = await readBody(req, limit);
  try { return JSON.parse(b.toString('utf8') || '{}'); } catch { throw store.httpError(400, 'Invalid request body.'); }
}
function cookies(req) { const o = {}; for (const p of String(req.headers.cookie || '').split(';')) { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } return o; }

// ---------- static files ----------
function serveFile(req, res, file, { immutable = false, csp = false } = {}) {
  let st; try { st = fs.statSync(file); } catch { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', ETag: etag, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' };
  if (ext === '.svg') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ...baseHeaders(), ETag: etag, 'Cache-Control': headers['Cache-Control'] }); res.end(); return true; }
  send(req, res, 200, fs.readFileSync(file), headers); return true;
}
function within(root, rel) {
  const p = path.normalize(path.join(root, rel));
  return p.startsWith(root + path.sep) ? p : null;
}

// ---------- public rendering (cached until publish) ----------
let cache = new Map();
store.onPublish(() => { cache = new Map(); });
const originOf = (req) => (process.env.SITE_ORIGIN || '').replace(/\/$/, '') || `${isHttps(req) ? 'https' : 'http'}://${req.headers.host || 'localhost'}`;
function html(req, res, status, body, extra = {}) {
  send(req, res, status, body, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache', 'Content-Security-Policy': PUBLIC_CSP, ...extra });
}
function publicPage(req, res, p) {
  const key = p + '|' + originOf(req);
  let out = cache.get(key);
  if (!out) { out = renderPage(p, store.getPublished(), store.getMedia(), { origin: originOf(req) }); cache.set(key, out); }
  return html(req, res, PUBLIC_PATHS.includes(p) || p === '/credits' ? 200 : 404, out);
}

const LEGACY = { '/index.html': '/', '/about.html': '/firm', '/services.html': '/capabilities', '/commodities.html': '/commodities', '/compliance.html': '/assurance', '/contact.html': '/contact', '/privacy.html': '/privacy' };

// ---------- enquiries ----------
const enqHits = new Map();
async function handleEnquiry(req, res) {
  const key = ip(req), now = Date.now();
  const hits = (enqHits.get(key) || []).filter(t => now - t < 10 * 60e3);
  if (hits.length >= 5) return fail(req, res, 429, 'Too many enquiries from this address. Please try again later.');
  const b = await readJSON(req, 24 * 1024);
  if (b.website) return json(req, res, 200, { ok: true }); // honeypot: pretend success
  const s = (k, n = 200) => String(b[k] ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
  const rec = { id: crypto.randomUUID(), at: new Date().toISOString(), status: 'new',
    organisation: s('organisation', 160), role: s('role'), name: s('name', 160), email: s('email', 200), phone: s('phone', 60),
    division: s('division'), material: s('material'), volume: s('volume', 80), delivery_terms: s('delivery_terms'), destination: s('destination', 200), timing: s('timing'),
    services: s('services'), notes: s('notes', 2000), confidentiality_agreement_requested: s('confidentiality_agreement_requested', 10) };
  if (!rec.organisation || !rec.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rec.email) || !rec.division) return fail(req, res, 400, 'Please complete the required fields.');
  hits.push(now); enqHits.set(key, hits);
  const list = store.readEnquiries(); list.unshift(rec); store.writeEnquiries(list.slice(0, 2000));
  store.audit('visitor', 'enquiry', rec.organisation);
  const endpoint = store.getPublished().site.form.endpoint;
  if (endpoint) fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec), signal: AbortSignal.timeout(8000) }).catch(() => {});
  json(req, res, 200, { ok: true });
}

// ---------- media upload ----------
function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.length > 12 && buf.slice(4, 8).toString() === 'ftyp' && /avif|avis|mif1/.test(buf.slice(8, 12).toString())) return 'avif';
  const head = buf.slice(0, 600).toString('utf8').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)?<svg[\s>]/i.test(head)) return 'svg';
  return null;
}
const svgUnsafe = (t) => /<script|<foreignObject|<iframe|<embed|<object|javascript:|\son[a-z]+\s*=|<!ENTITY|xlink:href\s*=\s*["']?(?!#)|href\s*=\s*["']?https?:/i.test(t);
async function addUpload(buf, filename, by) {
  const kind = sniff(buf);
  if (!kind) throw store.httpError(415, 'Use a JPEG, PNG, WebP, AVIF or SVG image.');
  const base = String(filename || 'image').replace(/\.[^.]+$/, '');
  const id = (base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'image') + '-' + crypto.randomBytes(2).toString('hex');
  const rec = { id, title: base.replace(/[-_]+/g, ' ').slice(0, 80), alt: '', focal: '50% 50%', credit: '', added: new Date().toISOString(), by };
  if (kind === 'svg') {
    const t = buf.toString('utf8'); if (svgUnsafe(t)) throw store.httpError(415, 'That SVG contains scripts or external references and cannot be used.');
    fs.writeFileSync(path.join(store.MEDIA_DIR, `${id}.svg`), t);
    Object.assign(rec, { custom: true, file: `${id}.svg`, widths: [], width: 0, height: 0 });
  } else {
    const img = sharp(buf, { limitInputPixels: 80e6 }).rotate();
    const meta = await sharp(await img.clone().toBuffer()).metadata();
    const widths = [640, 1200, 1920].filter(w => w < meta.width);
    if (!widths.length || widths[widths.length - 1] < meta.width) widths.push(Math.min(meta.width, 1920));
    for (const w of [...new Set(widths)]) {
      const p = () => img.clone().resize({ width: w, withoutEnlargement: true });
      await p().avif({ quality: 52, effort: 3 }).toFile(path.join(store.MEDIA_DIR, `${id}-${w}.avif`));
      await p().webp({ quality: 76 }).toFile(path.join(store.MEDIA_DIR, `${id}-${w}.webp`));
      await p().jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(store.MEDIA_DIR, `${id}-${w}.jpg`));
    }
    Object.assign(rec, { widths: [...new Set(widths)], width: meta.width, height: meta.height });
  }
  return store.addMedia(rec);
}

// ---------- staff API ----------
const needRole = (u, ...roles) => { if (!roles.includes(u.role)) throw store.httpError(403, 'You do not have permission to do that.'); };

function* walkText(node, trail = []) { // yields [path, value] for every string in content
  if (Array.isArray(node)) for (let i = 0; i < node.length; i++) yield* walkText(node[i], [...trail, i]);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) yield* walkText(v, [...trail, k]);
  else if (typeof node === 'string') yield [trail, node];
}
const fieldAt = (page, trail) => { // find the schema descriptor for a content path
  let fields = page.fields, f = null;
  for (const key of trail.filter(k => typeof k === 'string')) { f = fields?.find(x => x.k === key); if (!f) return null; fields = f.fields; }
  return f;
};

async function staffApi(req, res, url, sess) {
  const { user, s } = sess, m = req.method, p = url.pathname.slice((ADMIN + '/api').length) || '/';
  const unsafe = m !== 'GET' && m !== 'HEAD';
  if (unsafe) {
    if (req.headers['x-csrf-token'] !== s.csrf) return fail(req, res, 403, 'Your session needs to be refreshed. Reload the page.');
    const o = req.headers.origin; if (o && new URL(o).host !== req.headers.host) return fail(req, res, 403, 'Cross-site request refused.');
  }
  const gate = user.mustChange && !(p === '/password' || p === '/session' || p === '/logout');
  if (gate) return fail(req, res, 403, 'Choose a new password before continuing.');
  let m2;

  if (p === '/session' && m === 'GET') return json(req, res, 200, { user: auth.publicUser(user), csrf: s.csrf, adminPath: ADMIN });
  if (p === '/logout' && m === 'POST') { auth.logout(cookies(req)[COOKIE]); return json(req, res, 200, { ok: true }, { 'Set-Cookie': cookieStr(req, '', 0) }); }
  if (p === '/password' && m === 'POST') {
    const b = await readJSON(req); const err = await auth.changePassword(user.id, b.current, b.next, cookies(req)[COOKIE]);
    return err ? fail(req, res, 400, err) : json(req, res, 200, { ok: true });
  }

  if (p === '/content' && m === 'GET') {
    const published = store.getPublished(), draft = store.getDraft();
    return json(req, res, 200, { schema: PAGES, draft, published, hasChanges: store.hasChanges(), publishedAt: store.publishedAt(), media: store.getMedia(), defaults: DEFAULTS });
  }
  if ((m2 = p.match(/^\/content\/([a-z]+)$/)) && m === 'PUT') {
    const b = await readJSON(req); const saved = store.saveDraftPage(m2[1], b.data);
    store.audit(user.username, 'draft-saved', m2[1]);
    return json(req, res, 200, { data: saved, hasChanges: store.hasChanges() });
  }
  if (p === '/publish' && m === 'POST') {
    const b = await readJSON(req); const id = store.publish(user.username, b.note);
    store.audit(user.username, 'published', b.note || ''); return json(req, res, 200, { ok: true, revision: id, publishedAt: store.publishedAt() });
  }
  if (p === '/discard' && m === 'POST') { store.discardDraft(); store.audit(user.username, 'draft-discarded'); return json(req, res, 200, { draft: store.getDraft() }); }
  if (p === '/revisions' && m === 'GET') return json(req, res, 200, { items: store.listRevisions() });
  if ((m2 = p.match(/^\/revisions\/([0-9TZ-]+)\/restore$/)) && m === 'POST') {
    const r = store.getRevision(m2[1]); if (!r) return fail(req, res, 404, 'That version no longer exists.');
    store.setDraftAll(r.content); store.audit(user.username, 'revision-restored', m2[1]);
    return json(req, res, 200, { draft: store.getDraft(), hasChanges: store.hasChanges() });
  }

  if (p === '/media' && m === 'GET') return json(req, res, 200, { items: store.getMedia() });
  if (p === '/media' && m === 'POST') {
    const buf = await readBody(req, 14 * 1024 * 1024);
    const rec = await addUpload(buf, decodeURIComponent(String(req.headers['x-filename'] || 'image')), user.username);
    store.audit(user.username, 'media-uploaded', rec.id); cache = new Map(); return json(req, res, 200, { item: rec });
  }
  if ((m2 = p.match(/^\/media\/([a-z0-9-]+)$/))) {
    const rec = store.findMedia(m2[1]); if (!rec) return fail(req, res, 404, 'No such image.');
    if (m === 'PATCH') {
      const b = await readJSON(req); const cl = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
      if ('title' in b) rec.title = cl(b.title, 80); if ('alt' in b) rec.alt = cl(b.alt, 240); if ('credit' in b) rec.credit = cl(b.credit, 80);
      if ('focal' in b && /^\d{1,3}% \d{1,3}%$/.test(b.focal)) rec.focal = b.focal;
      store.saveMediaIndex(); cache = new Map(); store.audit(user.username, 'media-edited', rec.id); return json(req, res, 200, { item: rec });
    }
    if (m === 'DELETE') {
      const use = store.mediaUsage(rec.id); if (use.length) return json(req, res, 409, { error: 'This image is still used on the website.', usage: use });
      store.removeMedia(rec.id); cache = new Map(); store.audit(user.username, 'media-deleted', rec.id); return json(req, res, 200, { ok: true });
    }
  }

  if (p === '/enquiries' && m === 'GET') return json(req, res, 200, { items: store.readEnquiries() });
  if ((m2 = p.match(/^\/enquiries\/([0-9a-f-]{36})$/))) {
    const list = store.readEnquiries(), e = list.find(x => x.id === m2[1]); if (!e) return fail(req, res, 404, 'No such enquiry.');
    if (m === 'PATCH') { const b = await readJSON(req); if (['new', 'read', 'replied', 'archived'].includes(b.status)) e.status = b.status; store.writeEnquiries(list); return json(req, res, 200, { item: e }); }
    if (m === 'DELETE') { store.writeEnquiries(list.filter(x => x.id !== e.id)); store.audit(user.username, 'enquiry-deleted', e.organisation); return json(req, res, 200, { ok: true }); }
  }

  if (p === '/replace' && m === 'POST') {
    const b = await readJSON(req); const find = String(b.find || ''); const rep = String(b.replace ?? '');
    if (find.length < 2) return fail(req, res, 400, 'Enter at least two characters to find.');
    const draft = JSON.parse(JSON.stringify(store.getDraft())); const hits = [];
    for (const page of PAGES) {
      const edit = (node, trail) => {
        if (Array.isArray(node)) node.forEach((v, i) => { if (typeof v === 'string') return; edit(v, [...trail, i]); });
        if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) {
          if (typeof v === 'string') {
            const f = fieldAt(page, [...trail, k]);
            if (f && (f.t === 'text' || f.t === 'area') && v.includes(find)) { hits.push({ where: `${page.title} › ${[...trail, k].filter(x => typeof x === 'string').join(' › ')}`, before: v.slice(0, 120) }); node[k] = v.split(find).join(rep); }
          } else edit(v, [...trail, k]);
        }
      };
      edit(draft[page.id], []);
    }
    if (b.apply && hits.length) { store.setDraftAll(draft); store.audit(user.username, 'find-replace', `${find} → ${rep} (${hits.length})`); }
    return json(req, res, 200, { count: hits.length, hits: hits.slice(0, 40), applied: !!(b.apply && hits.length) });
  }

  if (p === '/users' && m === 'GET') { needRole(user, 'admin'); return json(req, res, 200, { items: auth.listUsers() }); }
  if (p === '/users' && m === 'POST') { needRole(user, 'admin'); const r = await auth.createUser(user.username, await readJSON(req)); return r.error ? fail(req, res, 400, r.error) : json(req, res, 200, r); }
  if ((m2 = p.match(/^\/users\/([0-9a-f-]{36})$/)) && m === 'DELETE') { needRole(user, 'admin'); if (m2[1] === user.id) return fail(req, res, 400, 'You cannot remove your own account.'); const err = auth.deleteUser(user.username, m2[1]); return err ? fail(req, res, 400, err) : json(req, res, 200, { ok: true }); }
  if ((m2 = p.match(/^\/users\/([0-9a-f-]{36})\/reset$/)) && m === 'POST') { needRole(user, 'admin'); const b = await readJSON(req); const err = await auth.resetUser(user.username, m2[1], b.password); return err ? fail(req, res, 400, err) : json(req, res, 200, { ok: true }); }
  if (p === '/audit' && m === 'GET') { needRole(user, 'admin'); return json(req, res, 200, { items: store.readAudit() }); }
  return fail(req, res, 404, 'Not found');
}

function cookieStr(req, token, maxAge) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=${ADMIN}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;
}

const ADMIN_CSP = "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; style-src-attr 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'; object-src 'none'";
const NOINDEX = { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'no-store' };

async function adminRoutes(req, res, url) {
  const rel = url.pathname.slice(ADMIN.length) || '/';
  // The shell and its assets are public by necessity (they hold no data); everything else needs a session.
  if (rel === '/' || rel === '') {
    if (url.pathname === ADMIN) { res.writeHead(308, { Location: ADMIN + '/', ...baseHeaders() }); return res.end(); }
    const shell = fs.readFileSync(path.join(ADMIN_DIR, 'index.html'), 'utf8').replaceAll('{{ADMIN}}', ADMIN);
    return send(req, res, 200, shell, { 'Content-Type': MIME['.html'], 'Content-Security-Policy': ADMIN_CSP, ...NOINDEX });
  }
  if (rel.startsWith('/static/')) {
    const f = within(ADMIN_DIR, rel.slice(8)); if (f && f !== path.join(ADMIN_DIR, 'index.html') && serveFile(req, res, f)) return;
    return fail(req, res, 404, 'Not found');
  }
  if (rel === '/api/login' && req.method === 'POST') {
    const b = await readJSON(req, 8 * 1024);
    const o = req.headers.origin; if (o && new URL(o).host !== req.headers.host) return fail(req, res, 403, 'Cross-site request refused.');
    const r = await auth.login(b.username, b.password, ip(req), req.headers['user-agent']);
    if (r.error) return fail(req, res, r.status, r.error);
    return json(req, res, 200, { user: r.user, csrf: r.session.csrf, adminPath: ADMIN }, { 'Set-Cookie': cookieStr(req, r.token, 12 * 3600) });
  }
  const sess = auth.sessionFor(cookies(req)[COOKIE]);
  if (!sess) return rel.startsWith('/api/') ? json(req, res, 401, { error: 'Sign in required.' }) : fail(req, res, 404, 'Not found');
  if (rel.startsWith('/api/')) return staffApi(req, res, url, sess);
  if (rel.startsWith('/preview')) { // draft preview inside the editor
    const p = rel.slice('/preview'.length) || '/';
    const out = renderPage(p === '' ? '/' : p, store.getDraft(), store.getMedia(), { origin: originOf(req) })
      .replace('<head>', `<head><base target="_top"><script src="${ADMIN}/static/preview.js" defer></script>`);
    return send(req, res, PUBLIC_PATHS.includes(p) || p === '/credits' ? 200 : 404, out, { 'Content-Type': MIME['.html'], 'Content-Security-Policy': PUBLIC_CSP, ...NOINDEX });
  }
  return fail(req, res, 404, 'Not found');
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { return send(req, res, 400, 'Bad request'); }
      url.pathname = pathname.replace(/\/{2,}/g, '/');
      if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return send(req, res, 405, 'Method not allowed');
      if (url.pathname === ADMIN || url.pathname.startsWith(ADMIN + '/')) return await adminRoutes(req, res, url);
      if (url.pathname === '/api/enquiry' && req.method === 'POST') return await handleEnquiry(req, res);
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'Method not allowed');
      if (url.pathname === '/healthz') return json(req, res, 200, { ok: true });
      if (url.pathname === '/robots.txt') return send(req, res, 200, `User-agent: *\nAllow: /\nSitemap: ${originOf(req)}/sitemap.xml\n`, { 'Content-Type': MIME['.txt'] });
      if (url.pathname === '/sitemap.xml') {
        const urls = [...PUBLIC_PATHS, '/credits'].map(p => `<url><loc>${originOf(req)}${p}</loc></url>`).join('');
        return send(req, res, 200, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { 'Content-Type': MIME['.xml'] });
      }
      if (LEGACY[url.pathname]) { res.writeHead(301, { Location: LEGACY[url.pathname] + url.search, ...baseHeaders() }); return res.end(); }
      if (url.pathname.startsWith('/media/')) { const f = within(store.MEDIA_DIR, url.pathname.slice(7)); if (f && serveFile(req, res, f, { immutable: true })) return; return send(req, res, 404, 'Not found'); }
      for (const dir of ['css', 'js', 'fonts', 'img']) if (url.pathname.startsWith(`/${dir}/`)) {
        const f = within(PUBLIC, url.pathname.slice(1)); if (f && serveFile(req, res, f, { immutable: dir === 'fonts' })) return; return send(req, res, 404, 'Not found');
      }
      const clean = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : '/';
      return publicPage(req, res, clean);
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      if (!res.headersSent) json(req, res, status, { error: status === 500 ? 'Something went wrong.' : e.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  store.init();
  const first = await auth.ensureAdmin();
  if (first) console.log(`\n  First-run staff account created.\n  Sign in at ${ADMIN}/  with  username: ${first.username}   password: ${first.password}\n  You will be asked to choose a new password. This message is shown once.\n`);
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, process.env.HOST || '0.0.0.0', () => console.log(`DC Consulting site on http://localhost:${port}  (staff portal at ${ADMIN}/)`));
}
