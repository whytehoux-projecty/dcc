// Server-side rendering of every public page from the content store. No client framework: the pages
// are complete HTML, and public/js/site.js only adds motion and the enquiry form behaviour.
import { PAGES } from './schema.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);
// Inline emphasis: *word* -> <em>word</em> (after escaping, so it can never inject markup).
const rt = (s) => esc(s).replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
const paras = (s) => String(s || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).map(x => `<p>${rt(x)}</p>`).join('');
const lines = (s) => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
const num = (i) => String(i + 1).padStart(2, '0');
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const safeHref = (h) => { h = String(h || '').trim(); return /^(\/(?!\/)|#|mailto:|tel:|https?:\/\/)/i.test(h) ? h : '/'; };

// Headline: every word is wrapped so it can rise into place on load.
function words(s) {
  let i = 0;
  const out = [];
  for (const part of String(s).split(/(\*[^*\n]+\*)/)) {
    const em = /^\*[^*]+\*$/.test(part);
    for (const w of (em ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean)) {
      const inner = `<span style="--i:${i++}">${esc(w)}</span>`;
      out.push(`<span class="w">${em ? `<em>${inner}</em>` : inner}</span>`);
    }
  }
  return out.join(' ');
}

// ---- photography ----
function mkPic(media) {
  const byId = new Map(media.map(m => [m.id, m]));
  return function pic(id, { sizes = '100vw', eager = false, alt, cls = '' } = {}) {
    const m = byId.get(id);
    if (!m) return `<div class="ph ${cls}" role="img" aria-label=""></div>`;
    const ws = [...m.widths].sort((a, b) => a - b);
    const ext = (e) => ws.map(w => `/media/${m.id}-${w}.${e} ${w}w`).join(', ');
    const mid = ws.includes(1200) ? 1200 : ws[ws.length - 1];
    const a = alt === undefined ? m.alt : alt;
    const load = eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
    const h = Math.round(m.height / m.width * mid);
    if (m.custom) {
      return `<img class="ph ${cls}" src="/media/${esc(m.file)}" alt="${esc(a)}" ${m.width ? `width="${m.width}" height="${m.height}"` : ''} ${load} style="object-position:${esc(m.focal || '50% 50%')}">`;
    }
    return `<picture><source type="image/avif" srcset="${ext('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${ext('webp')}" sizes="${sizes}">` +
      `<img class="ph ${cls}" src="/media/${m.id}-${mid}.jpg" srcset="${ext('jpg')}" sizes="${sizes}" alt="${esc(a)}" width="${mid}" height="${h}" ${load} style="object-position:${esc(m.focal || '50% 50%')}"></picture>`;
  };
}

export const NAV = [['/capabilities', 'Capabilities'], ['/commodities', 'Commodities'], ['/assurance', 'Assurance'], ['/firm', 'The firm'], ['/contact', 'Contact']];

// ---- shared chrome ----
function layout(ctx, { path, meta, body, bodyClass = '' }) {
  const { c, origin } = ctx;
  const name = c.site.company.name;
  const title = meta.title || name;
  const url = origin + (path === '/' ? '/' : path);
  const share = ctx.mediaMap.get(c.site.seo.share);
  const ogImg = share ? `${origin}/media/${share.id}-${share.widths.includes(1200) ? 1200 : share.widths[share.widths.length - 1]}.jpg` : '';
  const org = {
    '@context': 'https://schema.org', '@type': 'Organization', name, url: origin + '/',
    email: c.site.contact.email, telephone: c.site.contact.phone || undefined,
    address: lines(c.site.contact.address).length ? { '@type': 'PostalAddress', streetAddress: lines(c.site.contact.address).join(', ') } : undefined,
    sameAs: Object.values(c.site.social).filter(Boolean),
  };
  const links = NAV.map(([h, t]) => `<li><a href="${h}"${path === h ? ' aria-current="page"' : ''}>${esc(t)}</a></li>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#0A1628">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(name)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(meta.description)}"><meta property="og:url" content="${esc(url)}">
${ogImg ? `<meta property="og:image" content="${esc(ogImg)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(ogImg)}">` : ''}
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/libre-franklin-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<script src="/js/boot.js"></script>
<link rel="stylesheet" href="/css/site.css">
<script type="application/ld+json">${JSON.stringify(org).replace(/</g, '\\u003c')}</script>
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header" data-bar>
  <div class="container header-in">
    <a class="brand" href="/" aria-label="${esc(name)} home">${esc(name)}</a>
    <nav class="nav" aria-label="Main"><ul>${links}</ul></nav>
    <a class="btn btn--sm header-cta" href="/contact#enquiry">Submit a quote</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="drawer" aria-label="Menu"><i></i></button>
  </div>
  <nav class="mobile-nav" id="drawer" aria-label="Mobile">${NAV.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}<a class="btn" href="/contact#enquiry">Submit a quote</a></nav>
</header>
<main id="main">
${body}
</main>
${footer(ctx)}
<script src="/js/site.js" defer></script>
</body>
</html>`;
}

function footer(ctx) {
  const { c } = ctx;
  const s = c.site, name = s.company.name;
  const addr = lines(s.contact.address);
  const soc = [['linkedin', 'LinkedIn'], ['x', 'X'], ['facebook', 'Facebook'], ['instagram', 'Instagram']].filter(([k]) => s.social[k]);
  return `<footer class="foot">
  <div class="container">
    <div class="foot-grid">
      <div><a class="brand" href="/">${esc(name)}</a><p class="foot-note">${esc(s.footer.blurb)}</p></div>
      <div><h4>Firm</h4><ul><li><a href="/firm">The firm</a></li><li><a href="/capabilities">Capabilities</a></li><li><a href="/assurance">Assurance</a></li><li><a href="/contact">Contact</a></li></ul></div>
      <div><h4>Commodities</h4><ul>${(c.commodities.items || []).map(i => `<li><a href="/commodities#${esc(i.id)}">${esc(i.title)}</a></li>`).join('')}</ul></div>
      <div><h4>Reach us</h4><ul>
        <li><a href="mailto:${esc(s.contact.email)}">${esc(s.contact.email)}</a></li>
        ${s.contact.phone ? `<li><a href="tel:${esc(s.contact.phone.replace(/[^+\d]/g, ''))}">${esc(s.contact.phone)}</a></li>` : ''}
        ${addr.length ? `<li>${addr.map(esc).join('<br>')}</li>` : ''}
        ${soc.map(([k, l]) => `<li><a href="${esc(s.social[k])}" rel="noopener noreferrer" target="_blank">${l}</a></li>`).join('')}
      </ul></div>
    </div>
    <div class="foot__base"><span>© ${new Date().getFullYear()} ${esc(s.company.registered || name)}. ${esc(s.footer.legal)}</span><span><a href="/privacy">Privacy and terms</a> · <a href="/credits">Photography</a></span></div>
  </div>
</footer>`;
}

// ---- building blocks ----
const cta = (ctx, k) => {
  const d = ctx.c[k].close;
  return `<section class="cta"><div class="container cta-inner"><div><h2>${rt(d.title)}</h2><p>${esc(d.text)}</p></div><a class="btn" href="/contact#enquiry">${esc(d.button)}</a></div></section>`;
};
const fig = (ctx, id, caption, { sizes = '(min-width: 960px) 45vw, 100vw' } = {}) =>
  `<figure class="fig"><div class="ph-box">${ctx.pic(id, { sizes })}</div>${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
const facts = (rows, cls = '') => `<dl class="facts ${cls}">${rows.map(r => `<div><dt>${esc(r.label ?? r.title)}</dt><dd>${esc(r.text)}</dd></div>`).join('')}</dl>`;
const shead = (title, lead) => `<div class="shead${lead ? '' : ' shead--solo'}" data-reveal><h2>${rt(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>`;
const faq = (items) => `<div class="faq">${(items || []).map(it => `<details><summary>${esc(it.q)}</summary><div class="ans"><p>${esc(it.a)}</p></div></details>`).join('')}</div>`;
const pageHead = (ctx, k, crumb) => {
  const h = ctx.c[k].head;
  return `<section class="phead">${h.image ? `<div class="phead-media">${ctx.pic(h.image, { sizes: '100vw', eager: true, alt: '' })}</div>` : ''}<div class="container">
  <p class="crumb"><a href="/">${esc(ctx.c.site.company.name)}</a><span>${esc(crumb)}</span></p>
  <h1>${rt(h.title)}</h1><p class="lead">${esc(h.lead)}</p></div></section>`;
};
const textHead = (ctx, crumb, title, lead) => `<section class="phead"><div class="container"><p class="crumb"><a href="/">${esc(ctx.c.site.company.name)}</a><span>${esc(crumb)}</span></p><h1>${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div></section>`;

// ---- pages ----
function home(ctx) {
  const c = ctx.c.home, route = c.route, gap = c.gap, com = c.commodities, m = c.method, pr = c.process, fq = c.faq;
  const slides = [c.hero.image, c.hero.image2, c.hero.image3].filter(Boolean);
  return `
<section class="hero">
  <div class="hero-media" aria-hidden="true">${slides.map((id, i) => `<div class="hs">${ctx.pic(id, { sizes: '100vw', eager: i === 0, alt: '' })}</div>`).join('')}</div>
  <div class="hero-shade"></div>
  <div class="container hero-body"><div class="hero-copy">
    ${c.hero.folio ? `<p class="hero-kicker">${esc(c.hero.folio)}</p>` : ''}
    <h1>${rt(c.hero.headline)}</h1>
    <p class="lead">${esc(c.hero.lead)}</p>
    <div class="btn-row"><a class="btn" href="/contact#enquiry">${esc(c.hero.primary)}</a><a class="btn btn--ghost" href="#method">${esc(c.hero.secondary)}</a></div>
  </div></div>
  <div class="strip"><div class="container"><ol>${route.map(r => `<li><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></li>`).join('')}</ol></div></div>
</section>

<section class="section"><div class="container">
  ${shead(gap.title, gap.lead)}
  <div class="grid g3">${gap.items.map(p => `<article class="card" data-reveal><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join('')}</div>
</div></section>

<section class="section section--alt"><div class="container">
  ${shead(com.title)}
  <div class="grid g3">${com.items.map(p => `
    <a class="card card--img" href="${esc(safeHref(p.href))}" data-reveal><div class="ph-box">${ctx.pic(p.image, { sizes: '(min-width: 960px) 33vw, 100vw' })}</div><div class="body"><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p><span class="more">View details</span></div></a>`).join('')}</div>
  <div class="note-band" data-reveal><div><h3>${esc(com.noteTitle)}</h3><p>${esc(com.noteText)}</p></div><a class="btn btn--ghost" href="/commodities#other">${esc(com.noteButton)}</a></div>
</div></section>

<section class="section" id="method" data-method><div class="container">
  ${shead(m.title, m.lead)}
  <div class="wf" data-reveal>
    <div class="wf-tabs" role="tablist" aria-label="Stages">${m.stages.map((s, i) => `<button type="button" class="wf-tab" role="tab" id="mt${i}" aria-controls="mp${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><small>Stage ${i + 1}</small>${esc(s.title.split(' and ')[0].split(' to ')[0])}</button>`).join('')}</div>
    ${m.stages.map((s, i) => `
    <div class="wf-panel" role="tabpanel" id="mp${i}" aria-labelledby="mt${i}"${i ? ' hidden' : ''}>
      <div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p><div class="btn-row"><a class="btn btn--sm btn--ghost" href="${esc(safeHref(s.link))}">${esc(s.linkLabel)}</a></div></div>
      <div><div class="wf-img">${ctx.pic(s.image, { sizes: '(min-width: 960px) 40vw, 100vw' })}</div>${facts(s.rows)}</div>
    </div>`).join('')}
  </div>
</div></section>

<section class="section section--alt"><div class="container">
  ${shead(pr.title, pr.lead)}
  <ol class="stepgrid" data-reveal>${pr.items.map(it => `<li><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></li>`).join('')}</ol>
</div></section>

<section class="section"><div class="container split">
  <div class="sticky" data-reveal><h2>${rt(fq.title)}</h2><p class="lead" style="margin-top:1rem">${esc(fq.lead)}</p><div class="btn-row"><a class="btn btn--ghost" href="/contact#enquiry">Ask us directly</a></div></div>
  <div data-reveal>${faq(fq.items)}</div>
</div></section>
${cta(ctx, 'home')}`;
}

function capabilities(ctx) {
  const c = ctx.c.capabilities, mo = c.models, rc = c.receive;
  return `${pageHead(ctx, 'capabilities', 'Capabilities')}
<nav class="subnav" aria-label="Stages"><div class="container"><ul>${c.stages.map(s => `<li><a href="#${esc(s.id || slug(s.title))}">${esc(s.title.split(' and ')[0].split(' to ')[0])}</a></li>`).join('')}</ul></div></nav>
<section class="section" style="padding-block:0"><div class="container">
${c.stages.map((s, i) => `
  <article class="block" id="${esc(s.id || slug(s.title))}">
    <div class="block-grid${i % 2 ? ' block-grid--flip' : ''}">
      <div><h2>${esc(s.title)}</h2><p class="lead" style="margin:.9rem 0 1.5rem">${esc(s.intro)}</p>${facts(s.items)}<div class="btn-row"><a class="btn btn--ghost" href="${esc(safeHref(s.link))}">${esc(s.linkLabel)}</a></div></div>
      ${fig(ctx, s.image, s.caption, { sizes: '(min-width: 960px) 45vw, 100vw' })}
    </div>
  </article>`).join('')}
</div></section>

<section class="section section--alt"><div class="container">
  ${shead(mo.title, mo.lead)}
  <div class="grid g3">${mo.items.map(p => `<article class="card" data-reveal><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join('')}</div>
</div></section>

<section class="section"><div class="container split">
  <div class="sticky" data-reveal><h2>${rt(rc.title)}</h2><p class="lead" style="margin-top:1rem">${esc(rc.lead)}</p></div>
  <div data-reveal>${facts(rc.items)}</div>
</div></section>
${cta(ctx, 'capabilities')}`;
}

function commodities(ctx) {
  const c = ctx.c.commodities, t = c.terms;
  const q = (x) => encodeURIComponent(x.replace(/&amp;/g, '&'));
  return `${pageHead(ctx, 'commodities', 'Commodities')}
<nav class="subnav" aria-label="Commodities"><div class="container"><ul>${c.items.map(it => `<li><a href="#${esc(it.id)}">${esc(it.title)}</a></li>`).join('')}<li><a href="#terms">Delivery terms</a></li></ul></div></nav>
<section class="section" style="padding-block:0"><div class="container">
${c.items.map((it, i) => `
  <article class="block" id="${esc(it.id)}">
    <div class="block-head"><h2>${esc(it.title)}</h2><p class="lead">${esc(it.intro)}</p></div>
    <div class="block-grid${i % 2 ? ' block-grid--flip' : ''}">
      <div>${facts(it.rows)}<div class="chips">${it.marks.split(',').map(x => x.trim()).filter(Boolean).map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div><a class="btn" href="/contact?division=${q(it.title)}#enquiry">Enquire about this</a></div>
      ${fig(ctx, it.image, it.caption, { sizes: '(min-width: 960px) 45vw, 100vw' })}
    </div>
  </article>`).join('')}
</div></section>

<section class="section section--alt" id="terms"><div class="container">
  ${shead(t.title, t.lead)}
  <dl class="terms" data-reveal>${t.items.map(x => `<div><dt>${esc(x.code)}</dt><dd class="nm" style="color:var(--navy)">${esc(x.name)}</dd><dd class="md">${esc(x.mode)}</dd><dd>${esc(x.text)}</dd></div>`).join('')}</dl>
</div></section>
${cta(ctx, 'commodities')}`;
}

function assurance(ctx) {
  const c = ctx.c.assurance, d = c.documents, k = c.checkpoints, r = c.rules, mx = c.matrix;
  return `${pageHead(ctx, 'assurance', 'Assurance')}
<section class="section"><div class="container split">
  <div class="sticky" data-reveal><h2>${rt(d.title)}</h2><p class="lead" style="margin-top:1rem">${esc(d.note)}</p></div>
  <div data-reveal>${faq(d.items.map(it => ({ q: it.title, a: it.text })))}</div>
</div></section>

<section class="section section--alt"><div class="container">
  ${shead(mx.title, mx.lead)}
  <div class="grid g3">${mx.items.map(it => `<article class="card" data-reveal><h3>${esc(it.title)}</h3><ul class="ticks" style="margin-top:1rem">${lines(it.text).map(x => `<li>${esc(x)}</li>`).join('')}</ul></article>`).join('')}</div>
</div></section>

<section class="section"><div class="container split split--even">
  <div data-reveal><h2>${rt(k.title)}</h2><p class="lead" style="margin:1rem 0 1.75rem">${esc(k.lead)}</p>${fig(ctx, k.image, k.caption)}</div>
  <div class="card" data-reveal><ol class="steps">${k.items.map(it => `<li><div><strong>${esc(it.title)}</strong><span>${esc(it.text)}</span></div></li>`).join('')}</ol></div>
</div></section>

<section class="section section--alt"><div class="container">
  ${shead(r.title)}
  <div class="grid g3">${r.items.map(p => `<article class="card" data-reveal><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join('')}</div>
  ${r.decline ? `<p class="notice" data-reveal>${esc(r.decline)}</p>` : ''}
</div></section>
${cta(ctx, 'assurance')}`;
}

function firm(ctx) {
  const c = ctx.c.firm, w = c.who, t = c.tiers, cl = c.clients, m = c.message, lm = c.limits, s = ctx.c.site;
  const rows = [['Registered entity', s.company.registered], ['Operating region', s.company.region], ['Works with', w.worksWith], ['Leadership', w.leadership]].filter(f => f[1]);
  return `${pageHead(ctx, 'firm', 'The firm')}
<section class="section"><div class="container split">
  <div data-reveal><h2 style="margin-bottom:1.5rem">${rt(w.title)}</h2>${w.image ? fig(ctx, w.image, w.caption, { sizes: '(min-width: 960px) 40vw, 100vw' }) : ''}</div>
  <div class="prose-block" data-reveal>${paras(w.p1)}${paras(w.p2)}<dl class="facts" style="margin-top:1.5rem">${rows.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></div>
</div></section>

<section class="section section--alt"><div class="container">
  ${shead(lm.title, lm.lead)}
  <div class="grid g2 limits"><article class="card card--do" data-reveal><h3>We do</h3><ul class="ticks">${lines(lm.does).map(x => `<li>${esc(x)}</li>`).join('')}</ul></article><article class="card card--no" data-reveal><h3>We do not</h3><ul class="ticks ticks--no">${lines(lm.doesnot).map(x => `<li>${esc(x)}</li>`).join('')}</ul></article></div>
</div></section>

<section class="section"><div class="container split">
  <div class="sticky" data-reveal><h2>${rt(t.title)}</h2><p class="lead" style="margin:1rem 0 1.75rem">${esc(t.lead)}</p>${t.image ? fig(ctx, t.image, t.caption, { sizes: '(min-width: 960px) 40vw, 100vw' }) : ''}</div>
  <div class="flow" data-reveal>${t.items.map((it, i) => {
    const last = i === t.items.length - 1;
    return `<div${last ? ' class="us"' : ''}><span class="tier">Tier ${i + 1}${last ? ' · ' + esc(s.company.name) : ''}</span><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div>${!last && it.handoff ? `<div class="hand" aria-hidden="true">↓ ${esc(it.handoff)}</div>` : ''}`;
  }).join('')}</div>
</div></section>

<section class="section section--alt"><div class="container">
  ${shead(cl.title)}
  <div class="grid g4">${cl.items.map(it => `<article class="card" data-reveal><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></article>`).join('')}</div>
</div></section>

${m.show && m.text ? `<section class="section"><div class="container"><div class="quote" data-reveal><h2>${rt(m.title)}</h2><div>${paras(m.text)}<p class="who"><strong>${esc(m.name)}</strong><br>${esc(m.role)}</p></div></div></div></section>` : ''}
${cta(ctx, 'firm')}`;
}

function contact(ctx) {
  const c = ctx.c.contact, s = ctx.c.site, fq = c.faq;
  const addr = lines(s.contact.address);
  const rows = [['Email', `<a href="mailto:${esc(s.contact.email)}">${esc(s.contact.email)}</a>`], s.contact.phone && ['Telephone', `<a href="tel:${esc(s.contact.phone.replace(/[^+\d]/g, ''))}">${esc(s.contact.phone)}</a>`], addr.length && ['Office', addr.map(esc).join('<br>')], s.contact.hours && ['Hours', esc(s.contact.hours)], s.company.region && ['Regions', esc(s.company.region)], s.contact.response && ['We reply', esc(s.contact.response)]].filter(Boolean);
  const cfg = JSON.stringify({ endpoint: '/api/enquiry', email: s.contact.email, success: s.form.success }).replace(/</g, '\\u003c');
  const opt = (arr) => arr.map(o => `<option>${esc(o)}</option>`).join('');
  return `${pageHead(ctx, 'contact', 'Contact')}
<section class="section" id="enquiry"><div class="container split split--form">
  <form class="enq" id="enquiry-form" novalidate>
    <fieldset><legend>About you</legend><div class="fields f2">
      <div><label for="f-org">Organisation</label><input id="f-org" name="organisation" required autocomplete="organization" maxlength="120"></div>
      <div><label for="f-role">Your organisation is a</label><select id="f-role" name="role" required>${opt(['Procurement firm / mandate holder', 'Corporation / end buyer', 'Government or institution', 'Trading house / refinery', 'Other'])}</select></div>
      <div><label for="f-name">Your name and title</label><input id="f-name" name="name" required autocomplete="name" maxlength="120"></div>
      <div><label for="f-email">Work email</label><input id="f-email" name="email" type="email" required autocomplete="email" maxlength="160"></div>
      <div><label for="f-phone">Telephone <i>optional</i></label><input id="f-phone" name="phone" type="tel" autocomplete="tel" maxlength="60"></div>
    </div></fieldset>
    <fieldset><legend>What you need</legend><div class="fields f2">
      <div><label for="f-division">Commodity area</label><select id="f-division" name="division" required>${opt(['Rare earths & critical minerals', 'Crude oil & petroleum products', 'Gemstones', 'Other materials'])}</select></div>
      <div><label for="f-item" id="f-item-label">Material</label><select id="f-item" name="material" required></select></div>
    </div>
    <p class="fl">Services you need</p>
    <div class="checks">${['Sourcing', 'Processing', 'Documentation', 'Logistics'].map(x => `<label class="chk"><input type="checkbox" name="services" value="${x}" checked><span>${x}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>Quantity and delivery</legend><div class="fields f3">
      <div><label for="f-volume">Quantity</label><input id="f-volume" name="volume" inputmode="decimal" required placeholder="e.g. 500" maxlength="40"></div>
      <div><label for="f-unit">Unit</label><select id="f-unit" name="unit" required></select></div>
      <div><label for="f-terms">Delivery terms</label><select id="f-terms" name="terms" required></select></div>
    </div><div class="fields f2">
      <div><label for="f-dest">Destination port, airport or vault</label><input id="f-dest" name="destination" required maxlength="160"></div>
      <div><label for="f-timing">Timing</label><select id="f-timing" name="timing">${opt(['One-off spot delivery', 'Trial shipment, then ongoing supply', 'Long-term supply agreement', 'Not yet decided'])}</select></div>
    </div>
    <div class="fields"><div><label for="f-notes">Specification and other notes <i>optional</i></label><textarea id="f-notes" name="notes" rows="4" maxlength="2000" placeholder="Target purity or grade, preferred inspector, payment structure, anything we should know."></textarea></div></div></fieldset>
    <fieldset><legend>Confidentiality and consent</legend>
      <div class="checks checks--col"><label class="chk"><input type="checkbox" name="nda" checked><span>Send me your mutual confidentiality and non-circumvention agreement before I share end-buyer details.</span></label>
      <label class="chk"><input type="checkbox" name="consent" required><span>I agree that ${esc(s.company.name)} may use these details to reply to my enquiry, as described in the <a href="/privacy">privacy notice</a>.</span></label></div>
      <div class="hp" aria-hidden="true"><label for="f-website">Leave this empty</label><input id="f-website" name="website" tabindex="-1" autocomplete="off"></div>
    </fieldset>
    <div class="enq__foot"><button class="btn" type="submit">Send enquiry</button><p class="status" id="form-status" role="status" aria-live="polite"></p></div>
  </form>
  <aside>
    ${c.side && c.side.image ? `<div style="margin-bottom:1.25rem">${fig(ctx, c.side.image, c.side.caption, { sizes: '(min-width: 960px) 30vw, 100vw' })}</div>` : ''}
    <div class="card" style="margin-bottom:1.25rem"><h3>Contact details</h3><ul class="contact-list" style="margin-top:1rem">${rows.map(([a, b]) => `<li><strong>${a}</strong><span>${b}</span></li>`).join('')}</ul></div>
    <div class="card"><h3>What happens next</h3><ol class="steps" style="margin-top:1rem">${c.next.map(it => `<li><div><strong>${esc(it.title)}</strong><span>${esc(it.text)}</span></div></li>`).join('')}</ol></div>
  </aside>
</div></section>
<section class="section section--alt"><div class="container split"><div class="sticky"><h2>${rt(fq.title)}</h2></div><div>${faq(fq.items)}</div></div></section>
<script type="application/json" id="dc-config">${cfg}</script>`;
}

function privacy(ctx) {
  const c = ctx.c.privacy, s = ctx.c.site;
  return `${textHead(ctx, 'Privacy and terms', c.head.title, c.head.lead)}
<section class="section"><div class="container prose">
  <p><strong>Who we are.</strong> ${esc(s.company.registered || s.company.name)} operates this website. Contact: <a href="mailto:${esc(s.contact.email)}">${esc(s.contact.email)}</a>.</p>
  ${c.sections.map(x => `<h2>${esc(x.title)}</h2>${paras(x.text)}`).join('')}
</div></section>`;
}

function credits(ctx) {
  const used = ctx.media.filter(m => m.credit);
  return `${textHead(ctx, 'Photography', 'Photography credits', 'Photographs on this site are licensed from their authors through Unsplash and graded to a common look.')}
<section class="section"><div class="container"><ul class="credits">${used.map(m => `<li>${esc(m.title)} <span>${m.creditUrl ? `<a href="${esc(m.creditUrl)}" rel="noopener noreferrer" target="_blank">${esc(m.credit)}</a>` : esc(m.credit)}</span></li>`).join('')}</ul></div></section>`;
}

function notFound(ctx) {
  return `${textHead(ctx, 'Not found', 'This page could not be found.', 'It may have moved, or the address may be mistyped.')}
<section class="section"><div class="container"><div class="btn-row" style="margin-top:0"><a class="btn" href="/">Return home</a><a class="btn btn--ghost" href="/contact">Contact us</a></div></div></section>`;
}

const PAGEFNS = { '/': ['home', home], '/capabilities': ['capabilities', capabilities], '/commodities': ['commodities', commodities], '/assurance': ['assurance', assurance], '/firm': ['firm', firm], '/contact': ['contact', contact], '/privacy': ['privacy', privacy] };
export const PUBLIC_PATHS = Object.keys(PAGEFNS);

export function renderPage(path, content, media, { origin = '' } = {}) {
  const ctx = { c: content, media, mediaMap: new Map(media.map(m => [m.id, m])), pic: mkPic(media), origin: origin || content.site.seo.domain.replace(/\/$/, '') };
  if (path === '/credits') return layout(ctx, { path, meta: { title: `Photography | ${content.site.company.name}`, description: 'Credits for the photographs used on this website.' }, body: credits(ctx) });
  const entry = PAGEFNS[path];
  if (!entry) return layout(ctx, { path: '/404', meta: { title: `Page not found | ${content.site.company.name}`, description: 'Page not found.' }, body: notFound(ctx), bodyClass: 'is-404' });
  const [id, fn] = entry;
  return layout(ctx, { path, meta: content[id].meta, body: fn(ctx), bodyClass: `p-${id}` });
}
export { PAGES };
