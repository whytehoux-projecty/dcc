import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-'));
process.env.DATA_DIR = dir; process.env.ADMIN_PASSWORD = 'Test-Passw0rd-123';
const store = await import('../server/store.js');
const auth = await import('../server/auth.js');
const { createServer } = await import('../server/index.js');
let server, base, cookie = '', csrf = '';
before(async () => { store.init(); await auth.ensureAdmin(); server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const call = (p, o = {}) => fetch(base + p, { redirect: 'manual', ...o, headers: { ...(cookie ? { cookie } : {}), ...(o.csrf === false ? {} : csrf ? { 'x-csrf-token': csrf } : {}), ...(o.json ? { 'content-type': 'application/json' } : {}), ...o.headers }, body: o.json ? JSON.stringify(o.json) : o.body });
async function login() {
  const r = await call('/admin/api/login', { method: 'POST', json: { username: 'admin', password: 'Test-Passw0rd-123' } });
  cookie = r.headers.get('set-cookie').split(';')[0]; csrf = (await r.json()).csrf;
}

test('public pages render and never mention the staff portal', async () => {
  for (const p of ['/', '/capabilities', '/commodities', '/assurance', '/firm', '/contact', '/privacy', '/credits']) {
    const r = await call(p); assert.equal(r.status, 200, p);
    const t = await r.text(); assert.ok(!/\/admin/.test(t), `${p} leaks admin path`);
  }
  assert.equal((await call('/nope')).status, 404);
  assert.ok(!/admin/i.test(await (await call('/robots.txt')).text()));
  assert.ok(!/admin/i.test(await (await call('/sitemap.xml')).text()));
});
test('legacy .html addresses redirect', async () => {
  const r = await call('/services.html'); assert.equal(r.status, 301); assert.equal(r.headers.get('location'), '/capabilities');
});
test('staff API needs a session and CSRF token', async () => {
  assert.equal((await call('/admin/api/content')).status, 401);
  assert.equal((await call('/admin/api/login', { method: 'POST', json: { username: 'admin', password: 'bad' } })).status, 401);
  await login();
  assert.equal((await call('/admin/api/content')).status, 200);
  assert.equal((await call('/admin/api/publish', { method: 'POST', json: {}, csrf: false })).status, 403);
});
test('login is throttled after repeated failures', async () => {
  auth.resetThrottle();
  for (let i = 0; i < 5; i++) await call('/admin/api/login', { method: 'POST', json: { username: 'admin', password: 'x' + i } });
  assert.equal((await call('/admin/api/login', { method: 'POST', json: { username: 'admin', password: 'Test-Passw0rd-123' } })).status, 429);
  auth.resetThrottle();
});
test('drafts stay private until published; content is escaped', async () => {
  const c = await (await call('/admin/api/content')).json();
  const page = c.draft.home; page.hero.headline = 'Draft <script>alert(1)</script> *line*';
  assert.equal((await call('/admin/api/content/home', { method: 'PUT', json: { data: page } })).status, 200);
  assert.ok(!(await (await call('/')).text()).includes('Draft &lt;script'));
  const prev = await (await call('/admin/preview/')).text(); assert.ok(prev.includes('&lt;script&gt;alert(1)') && !prev.includes('<script>alert(1)'));
  assert.equal((await call('/admin/api/publish', { method: 'POST', json: { note: 't' } })).status, 200);
  const live = await (await call('/')).text(); assert.ok(live.includes('Draft') && !live.includes('<script>alert(1)'));
});
test('a published version can be restored into the draft', async () => {
  const revs = await (await call('/admin/api/revisions')).json(); assert.ok(revs.items.length >= 1);
  const r = await call(`/admin/api/revisions/${revs.items[0].id}/restore`, { method: 'POST', json: {} }); assert.equal(r.status, 200);
});
test('uploads: validates type, builds variants, protects in-use images', async () => {
  const bad = await call('/admin/api/media', { method: 'POST', body: Buffer.from('not an image'), headers: { 'x-filename': 'a.jpg' } }); assert.equal(bad.status, 415);
  const evil = await call('/admin/api/media', { method: 'POST', body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), headers: { 'x-filename': 'e.svg' } }); assert.equal(evil.status, 415);
  const png = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#123' } }).png().toBuffer();
  const ok = await call('/admin/api/media', { method: 'POST', body: png, headers: { 'x-filename': 'My Photo.png' } }); assert.equal(ok.status, 200);
  const { item } = await ok.json(); assert.ok(fs.existsSync(path.join(dir, 'media', `${item.id}-640.webp`)));
  assert.equal((await call(`/media/${item.id}-640.webp`)).status, 200);
  const del = await call('/admin/api/media/pit-terraces', { method: 'DELETE' }); assert.equal(del.status, 409);
  assert.equal((await call(`/admin/api/media/${item.id}`, { method: 'DELETE' })).status, 200);
});
test('enquiries are stored, validated and honeypotted', async () => {
  const good = { organisation: 'Acme', name: 'A B', email: 'a@b.co', division: 'Gemstones', material: 'x', volume: '1 kg' };
  assert.equal((await call('/api/enquiry', { method: 'POST', json: good, csrf: false })).status, 200);
  assert.equal((await call('/api/enquiry', { method: 'POST', json: { ...good, email: 'nope' }, csrf: false })).status, 400);
  await call('/api/enquiry', { method: 'POST', json: { ...good, website: 'spam' }, csrf: false });
  const list = await (await call('/admin/api/enquiries')).json(); assert.equal(list.items.length, 1);
});
test('find and replace previews then applies to the draft', async () => {
  const p = await (await call('/admin/api/replace', { method: 'POST', json: { find: 'DC Consulting', replace: 'DC Group' } })).json(); assert.ok(p.count > 0 && !p.applied);
  const a = await (await call('/admin/api/replace', { method: 'POST', json: { find: 'DC Consulting', replace: 'DC Group', apply: true } })).json(); assert.ok(a.applied);
  const c = await (await call('/admin/api/content')).json(); assert.ok(c.draft.site.company.name === 'DC Group' || JSON.stringify(c.draft).includes('DC Group'));
});
test('weak passwords are refused', () => { assert.ok(auth.passwordProblem('short1')); assert.equal(auth.passwordProblem('a-long-enough-pass9'), ''); });
