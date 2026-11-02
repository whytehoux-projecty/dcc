// Writes a static copy of the published site (no staff portal, no server) for review or static hosting.
// The enquiry form falls back to the visitor's mail app. Usage: node tools/export-static.js [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULTS } from '../server/schema.js';
import { renderPage, PUBLIC_PATHS } from '../server/render.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || path.join(here, '../dist-static'));
const origin = process.env.SITE_ORIGIN || DEFAULTS.site.seo.domain;
const media = JSON.parse(fs.readFileSync(path.join(here, '../seed/media.json'), 'utf8'));
fs.rmSync(out, { recursive: true, force: true });
for (const d of ['css', 'js', 'fonts', 'img', 'media']) fs.mkdirSync(path.join(out, d), { recursive: true });
const copy = (from, to) => fs.cpSync(path.join(here, '..', from), path.join(out, to), { recursive: true });
copy('public/js', 'js'); copy('public/fonts', 'fonts'); copy('public/img', 'img'); copy('seed/media', 'media');
fs.writeFileSync(path.join(out, 'css/site.css'), fs.readFileSync(path.join(here, '../public/css/site.css'), 'utf8').replaceAll('url(/fonts/', 'url(../fonts/'));
const file = (p) => (p === '/' ? 'index.html' : p.slice(1) + '.html');
for (const p of [...PUBLIC_PATHS, '/credits']) {
  let h = renderPage(p, DEFAULTS, media, { origin });
  h = h.replace(/(["\s,])\/(media|css|js|fonts|img)\//g, '$1$2/');
  h = h.replace(/href="\/([a-z]*)(#[^"]*|\?[^"]*)?"/g, (m, pg, rest) => `href="${pg ? pg + '.html' : 'index.html'}${rest || ''}"`);
  h = h.replace(/<link rel="canonical"[^>]*>/, '');
  fs.writeFileSync(path.join(out, file(p)), h);
}
// A 404 for static hosts
fs.writeFileSync(path.join(out, '404.html'), renderPage('/__missing', DEFAULTS, media, { origin }).replace(/(["\s,])\/(media|css|js|fonts|img)\//g, '$1$2/').replace(/href="\/([a-z]*)"/g, (m, pg) => `href="${pg ? pg + '.html' : 'index.html'}"`));
console.log('exported to', out);
