(function () {
  'use strict';
  var root = document.getElementById('app'), ADMIN = root.dataset.admin, API = ADMIN + '/api';
  var S = { user: null, csrf: '', schema: [], draft: null, published: null, media: [], hasChanges: false, publishedAt: null, enq: [], saving: null };

  /* ---------- helpers ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v; else if (v === true) el.setAttribute(k, ''); else el.setAttribute(k, v);
    }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; if (Array.isArray(c)) c.forEach(function (x) { if (x) el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); }); else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return el;
  }
  function api(method, path, body, raw) {
    var opt = { method: method, headers: { 'X-CSRF-Token': S.csrf }, credentials: 'same-origin' };
    if (raw) { opt.body = raw.body; opt.headers['Content-Type'] = 'application/octet-stream'; opt.headers['X-Filename'] = encodeURIComponent(raw.name); }
    else if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    return fetch(API + path, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || 'Request failed'); e.status = r.status; e.data = j; if (r.status === 401) { S.user = null; render(); } throw e; } return j; }); });
  }
  function toast(msg, bad) { var t = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: 'status', text: msg }); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4200); }
  function fmt(d) { try { return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return d || ''; } }
  var $mediaById = function (id) { return S.media.filter(function (m) { return m.id === id; })[0]; };
  var thumb = function (m) { return m ? (m.custom ? '/media/' + m.file : '/media/' + m.id + '-' + m.widths[0] + '.jpg') : ''; };
  var MARK = function () { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('fill', 'none'); s.innerHTML = '<path d="M14 12H30C44 12 52 20.5 52 32C52 43.5 44 52 30 52H14V12Z" stroke="#1C3556" stroke-width="6" stroke-linejoin="round"/><path d="M38 23C30 23 25 27 25 32C25 37 30 41 38 41" stroke="#1C3556" stroke-width="5.5" stroke-linecap="round"/><rect x="11" y="28" width="6" height="8" rx="1" fill="#C1A066"/>'; return s; };

  /* ---------- login ---------- */
  function contourBg() { var s = document.createElement('span'); s.setAttribute('aria-hidden', 'true'); return s; }
  function viewLogin() {
    var err = h('p', { class: 'msg msg--bad', role: 'alert', hidden: true });
    var u = h('input', { type: 'text', id: 'u', autocomplete: 'username', required: true, autocapitalize: 'none', spellcheck: 'false' });
    var p = h('input', { type: 'password', id: 'p', autocomplete: 'current-password', required: true });
    var btn = h('button', { class: 'b b--solid', type: 'submit', text: 'Sign in' });
    var form = h('form', { onsubmit: function (e) {
      e.preventDefault(); btn.disabled = true; err.hidden = true;
      fetch(API + '/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u.value, password: p.value }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Could not sign in.'); return j; }); })
        .then(function (j) { S.user = j.user; S.csrf = j.csrf; return boot(); })
        .catch(function (x) { err.textContent = x.message; err.hidden = false; p.value = ''; p.focus(); }).then(function () { btn.disabled = false; });
    } },
      h('h2', { text: 'Staff sign in' }), h('p', { class: 's', text: 'Manage the website’s text, images and contact details.' }), err,
      h('label', { class: 'f', for: 'u' }, h('span', { class: 'lbl', text: 'Username' }), u), h('label', { class: 'f', for: 'p' }, h('span', { class: 'lbl', text: 'Password' }), p), btn);
    return h('div', { class: 'login' },
      h('div', { class: 'login__art' }, contourBg(), h('div', { class: 'brandrow' }, h('strong', { text: 'DC Consulting' }), h('span', { class: 'mono', text: 'Site editor' })), h('h1', null, 'Change the site. ', h('em', { text: 'Publish when ready.' })), h('p', { class: 'mono', text: 'Authorised staff only' })),
      h('div', { class: 'login__form' }, form));
  }
  function viewMustChange() {
    var err = h('p', { class: 'msg msg--bad', hidden: true });
    var cur = h('input', { type: 'password', autocomplete: 'current-password', required: true }), nw = h('input', { type: 'password', autocomplete: 'new-password', required: true });
    var form = h('form', { onsubmit: function (e) { e.preventDefault(); api('POST', '/password', { current: cur.value, next: nw.value }).then(function () { S.user.mustChange = false; toast('Password updated.'); return boot(); }).catch(function (x) { err.textContent = x.message; err.hidden = false; }); } },
      h('h2', { text: 'Choose a new password' }), h('p', { class: 's', text: 'Use at least 12 characters, with letters and a number.' }), err,
      h('label', { class: 'f' }, h('span', { class: 'lbl', text: 'Current password' }), cur), h('label', { class: 'f' }, h('span', { class: 'lbl', text: 'New password' }), nw), h('button', { class: 'b b--solid', type: 'submit', text: 'Save password' }));
    return h('div', { class: 'login' }, h('div', { class: 'login__art' }, contourBg(), h('div', { class: 'brandrow' }, h('strong', { text: 'DC Consulting' }), h('span', { class: 'mono', text: 'Site editor' })), h('h1', null, 'One last ', h('em', { text: 'step.' }))), h('div', { class: 'login__form' }, form));
  }

  /* ---------- shell ---------- */
  var route = function () { return (location.hash || '#/overview').slice(2).split('/'); };
  function newCount() { return S.enq.filter(function (e) { return e.status === 'new'; }).length; }
  function shell(title, content, opts) {
    opts = opts || {}; var r = route();
    var link = function (href, text, extra) { return h('a', { href: '#/' + href, 'aria-current': (r.join('/') === href || (r[0] === 'page' && href === 'page/' + r[1])) ? 'page' : null }, text, extra); };
    var pages = S.schema.map(function (p) { return link('page/' + p.id, p.title); });
    var side = h('aside', { class: 'side' }, h('div', { class: 'brandrow' }, h('strong', { text: 'DC Consulting' }), h('span', { class: 'mono', text: 'Site editor' })),
      h('nav', { 'aria-label': 'Sections' }, link('overview', 'Overview'), h('h4', { text: 'Pages' }), pages, h('h4', { text: 'Library' }), link('media', 'Images'), link('enquiries', 'Enquiries', newCount() ? h('span', { class: 'n', text: String(newCount()) }) : null), h('h4', { text: 'Tools' }), link('replace', 'Find and replace'), link('versions', 'Published versions'), S.user.role === 'admin' ? link('team', 'Team and activity') : null, link('account', 'My account')),
      h('div', { class: 'side__foot' }, h('div', { text: S.user.name }), h('button', { type: 'button', text: 'Sign out', onclick: function () { api('POST', '/logout').then(function () { S.user = null; render(); }); } })));
    var state = h('span', { class: 'state' + (S.hasChanges ? ' is-dirty' : ''), id: 'state', text: S.hasChanges ? 'Unpublished changes' : (S.publishedAt ? 'Live · ' + fmt(S.publishedAt) : 'Live') });
    var top = h('div', { class: 'top' }, h('h1', { text: title }), state,
      S.hasChanges ? h('button', { class: 'b b--sm', type: 'button', text: 'Discard changes', onclick: discard }) : null,
      h('a', { class: 'b b--sm', href: '/', target: '_blank', rel: 'noopener', text: 'View live site' }),
      h('button', { class: 'b b--bronze', type: 'button', id: 'pub', text: 'Publish', disabled: !S.hasChanges, onclick: publish }));
    return h('div', { class: 'shell' }, side, h('main', { class: 'main' }, top, h('div', { class: 'view' + (opts.edit ? ' view--edit' : ''), id: 'view' }, content)));
  }
  function setDirty(v) { S.hasChanges = v; var s = document.getElementById('state'), p = document.getElementById('pub'); if (s) { s.className = 'state' + (v ? ' is-dirty' : ''); s.textContent = v ? 'Unpublished changes' : 'Live'; } if (p) p.disabled = !v; }
  function publish() {
    var note = h('input', { class: 'in', type: 'text', maxlength: 200, placeholder: 'What changed? (optional)' });
    modal('Publish to the website', h('div', null, h('p', { text: 'Your changes will replace the live pages straight away. The current version is kept so it can be restored.' }), h('div', { style: 'margin-top:1rem' }, h('span', { class: 'lbl', text: 'Note for the history' }), note)), [
      { text: 'Publish now', cls: 'b--solid', run: function (close) { return api('POST', '/publish', { note: note.value }).then(function (j) { S.hasChanges = false; S.publishedAt = j.publishedAt; S.published = JSON.parse(JSON.stringify(S.draft)); close(); toast('Published. The live site is updated.'); render(); }); } }, { text: 'Cancel' }]);
  }
  function discard() {
    modal('Discard unpublished changes?', h('p', { text: 'All edits since the last publish will be lost and the pages return to what is live.' }), [{ text: 'Discard changes', cls: 'b--danger', run: function (close) { return api('POST', '/discard').then(function (j) { S.draft = j.draft; S.hasChanges = false; close(); toast('Changes discarded.'); render(); }); } }, { text: 'Keep editing' }]);
  }
  function modal(title, body, actions) {
    var prev = document.activeElement;
    var close = function () { m.remove(); document.removeEventListener('keydown', esc); if (prev && prev.focus) prev.focus(); };
    var esc = function (e) { if (e.key === 'Escape') close(); };
    var err = h('p', { class: 'msg msg--bad', hidden: true });
    var foot = h('div', { class: 'modal__f' }, (actions || []).map(function (a) { return h('button', { class: 'b ' + (a.cls || ''), type: 'button', text: a.text, onclick: function (e) { if (!a.run) return close(); var b = e.currentTarget; b.disabled = true; err.hidden = true; Promise.resolve(a.run(close)).catch(function (x) { err.textContent = x.message; err.hidden = false; b.disabled = false; }); } }); }));
    var m = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onmousedown: function (e) { if (e.target === m) close(); } }, h('div', { class: 'modal__in' }, h('div', { class: 'modal__h' }, h('h3', { text: title }), h('button', { class: 'b b--sm b--ghost', type: 'button', text: 'Close', onclick: close })), h('div', { class: 'modal__b' }, err, body), actions ? foot : null));
    document.body.appendChild(m); document.addEventListener('keydown', esc);
    var f = m.querySelector('input,textarea,select,.tile,button.b'); if (f) f.focus();
    return { close: close, err: err };
  }

  /* ---------- page editor (schema-driven) ---------- */
  var saveTimer = null, previewFrame = null;
  function blank(fields) { var o = {}; fields.forEach(function (f) { o[f.k] = f.t === 'group' ? blank(f.fields) : f.t === 'list' ? [] : f.t === 'toggle' ? !!f.d : ''; }); return o; }
  function queueSave(pageId) {
    setDirty(true); clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      api('PUT', '/content/' + pageId, { data: S.draft[pageId] }).then(function (j) { S.hasChanges = j.hasChanges; setDirty(j.hasChanges); if (previewFrame) previewFrame.contentWindow.location.reload(); }).catch(function (e) { toast(e.message, true); });
    }, 700);
  }
  function renderField(f, obj, pageId, depth) {
    var change = function () { queueSave(pageId); };
    if (f.t === 'group') return h('details', { class: 'grp', open: depth === 0 && f.k !== 'meta' }, h('summary', { text: f.label }), h('div', { class: 'grp__b' }, f.help ? h('p', { class: 'help', style: 'margin:-.2rem 0 1rem', text: f.help }) : null, f.fields.map(function (c) { return renderField(c, obj[f.k], pageId, depth + 1); })));
    if (f.t === 'toggle') { var cb = h('input', { type: 'checkbox', onchange: function () { obj[f.k] = cb.checked; change(); } }); cb.checked = !!obj[f.k]; return h('label', { class: 'tog' }, cb, h('i'), h('span', { text: f.label })); }
    if (f.t === 'image') return imageField(f, obj, change);
    if (f.t === 'list') return listField(f, obj, pageId, depth);
    var inp = f.t === 'area' ? h('textarea', { rows: f.rows || 4, maxlength: f.max || 4000 }) : h('input', { type: f.t === 'url' ? 'url' : 'text', maxlength: f.max || 300, placeholder: f.t === 'url' ? 'https://' : null });
    inp.value = obj[f.k] || '';
    var count = f.max && f.max <= 400 ? h('span', { class: 'count', text: (inp.value.length) + '/' + f.max }) : null;
    inp.addEventListener('input', function () { obj[f.k] = inp.value; if (count) count.textContent = inp.value.length + '/' + f.max; change(); });
    return h('label', { class: 'f' }, h('span', { class: 'lbl' }, f.label, count), inp, f.help ? h('span', { class: 'help', text: f.help }) : null);
  }
  function imageField(f, obj, change) {
    var t = h('div', { class: 'imgf__t' }), name = h('span', { class: 'help' });
    var paint = function () { var m = $mediaById(obj[f.k]); t.textContent = ''; if (m) { t.appendChild(h('img', { src: thumb(m), alt: '' })); name.textContent = m.title + (m.alt ? '' : ' · no description yet'); } else { t.textContent = 'none'; name.textContent = 'No image'; } };
    paint();
    return h('div', { class: 'f' }, h('span', { class: 'lbl', text: f.label }), h('div', { class: 'imgf' }, t, h('div', null, h('div', { class: 'imgf__a' },
      h('button', { class: 'b b--sm', type: 'button', text: obj[f.k] ? 'Replace' : 'Choose image', onclick: function (e) { pickMedia(function (id) { obj[f.k] = id; paint(); e.target.textContent = id ? 'Replace' : 'Choose image'; change(); }); } }),
      h('button', { class: 'b b--sm b--ghost', type: 'button', text: 'Remove', onclick: function () { obj[f.k] = ''; paint(); change(); } })), name)));
  }
  function listField(f, obj, pageId, depth) {
    var arr = obj[f.k], box = h('div'), change = function () { queueSave(pageId); };
    function itemTitle(it) { var v = it[f.itemLabel || 'title']; return v || 'Untitled'; }
    function paint() {
      box.textContent = '';
      arr.forEach(function (it, i) {
        var tt = h('span', { class: 't', text: itemTitle(it) });
        var det = h('details', { class: 'item' }, h('summary', null, h('span', { class: 'mono', text: String(i + 1).padStart(2, '0') }), tt,
          h('button', { class: 'ib', type: 'button', title: 'Move up', 'aria-label': 'Move up', text: '↑', disabled: i === 0, onclick: function (e) { e.preventDefault(); arr.splice(i - 1, 0, arr.splice(i, 1)[0]); paint(); change(); } }),
          h('button', { class: 'ib', type: 'button', title: 'Move down', 'aria-label': 'Move down', text: '↓', disabled: i === arr.length - 1, onclick: function (e) { e.preventDefault(); arr.splice(i + 1, 0, arr.splice(i, 1)[0]); paint(); change(); } }),
          h('button', { class: 'ib', type: 'button', title: 'Delete', 'aria-label': 'Delete item', text: '✕', onclick: function (e) { e.preventDefault(); if (confirm('Delete “' + itemTitle(it) + '”?')) { arr.splice(i, 1); paint(); change(); } } })),
          h('div', { class: 'item__b' }, f.fields.map(function (c) { return renderField(c, it, pageId, depth + 2); })));
        det.addEventListener('input', function () { tt.textContent = itemTitle(it); });
        box.appendChild(det);
      });
      if (!arr.length) box.appendChild(h('p', { class: 'help', text: 'Nothing here yet.' }));
    }
    paint();
    var add = h('button', { class: 'b b--sm', type: 'button', text: 'Add ' + (f.label.replace(/s$/i, '').toLowerCase()), disabled: arr.length >= (f.max || 50), onclick: function () { arr.push(blank(f.fields)); paint(); change(); add.disabled = arr.length >= (f.max || 50); } });
    return h('div', { class: 'lst' }, h('span', { class: 'lbl' }, f.label, h('span', { class: 'count', text: 'max ' + (f.max || 50) })), f.help ? h('span', { class: 'help', style: 'margin:-.2rem 0 .6rem', text: f.help }) : null, box, add);
  }
  function viewPage(id) {
    var page = S.schema.filter(function (p) { return p.id === id; })[0]; if (!page) return shell('Not found', h('p', { text: 'No such page.' }));
    var data = S.draft[id];
    var frame = h('iframe', { title: 'Preview of ' + page.title, src: ADMIN + '/preview' + (page.path || '/'), referrerpolicy: 'same-origin' }); previewFrame = frame;
    var pv = h('div', { class: 'preview' }, h('div', { class: 'preview__bar' }, h('span', { class: 'mono', text: 'Preview · draft' }),
      h('button', { class: 'b b--sm', type: 'button', text: 'Desktop', onclick: function () { pv.classList.remove('is-mobile'); } }), h('button', { class: 'b b--sm', type: 'button', text: 'Phone', onclick: function () { pv.classList.add('is-mobile'); } })), h('div', { class: 'preview__wrap' }, frame));
    var pane = h('div', { class: 'pane' }, h('p', { class: 'help', style: 'margin-bottom:1.2rem', text: page.blurb + ' Changes save as you type and appear in the preview; nothing goes live until you publish.' }), page.fields.map(function (f) { return renderField(f, data, id, 0); }));
    return shell(page.title, [pane, pv], { edit: true });
  }

  /* ---------- media ---------- */
  function upload(files, done) {
    var list = Array.prototype.slice.call(files), n = 0;
    (function next() {
      if (!list.length) return done && done();
      var f = list.shift(); toast('Uploading ' + f.name + '…');
      api('POST', '/media', undefined, { body: f, name: f.name }).then(function (j) { S.media.unshift(j.item); n++; next(); }).catch(function (e) { toast(f.name + ': ' + e.message, true); next(); });
    })();
  }
  function pickMedia(cb) {
    var grid = h('div', { class: 'media' }), fi = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif,image/svg+xml', multiple: true, hidden: true, onchange: function () { upload(fi.files, paint); } });
    function paint() { grid.textContent = ''; S.media.forEach(function (m) { grid.appendChild(h('button', { class: 'tile', type: 'button', onclick: function () { mm.close(); cb(m.id); } }, h('div', { class: 'th' }, h('img', { src: thumb(m), alt: '', loading: 'lazy' })), h('div', { class: 'cap' }, m.title, m.alt ? null : h('em', { text: ' · needs description' })))); }); }
    var mm = modal('Choose an image', h('div', null, h('div', { class: 'row2', style: 'margin-bottom:1rem' }, h('button', { class: 'b b--sm b--solid', type: 'button', text: 'Upload new image', onclick: function () { fi.click(); } }), fi), grid), [{ text: 'Cancel' }]); paint();
  }
  function viewMedia() {
    var sel = null, grid = h('div', { class: 'media' }), side = h('div', { class: 'panel' });
    var fi = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif,image/svg+xml', multiple: true, hidden: true, onchange: function () { upload(fi.files, paint); } });
    var drop = h('div', { class: 'drop', ondragover: function (e) { e.preventDefault(); drop.classList.add('over'); }, ondragleave: function () { drop.classList.remove('over'); }, ondrop: function (e) { e.preventDefault(); drop.classList.remove('over'); upload(e.dataTransfer.files, paint); } },
      'Drop images here or ', h('button', { class: 'b b--sm', type: 'button', text: 'choose files', onclick: function () { fi.click(); } }), fi, h('span', { class: 'help', text: 'JPEG, PNG, WebP, AVIF or SVG, up to 14 MB. Sizes and modern formats are created automatically.' }));
    function paint() {
      grid.textContent = '';
      S.media.forEach(function (m) { grid.appendChild(h('button', { class: 'tile' + (sel === m.id ? ' sel' : ''), type: 'button', onclick: function () { sel = m.id; paint(); } }, h('div', { class: 'th' }, h('img', { src: thumb(m), alt: '', loading: 'lazy' })), h('div', { class: 'cap' }, m.title, m.alt ? null : h('em', { text: ' · needs description' })))); });
      side.textContent = ''; var m = $mediaById(sel);
      if (!m) { side.appendChild(h('p', { class: 'help', text: 'Select an image to edit its description, focal point or remove it.' })); return; }
      var title = h('input', { type: 'text', value: m.title, maxlength: 80 }), alt = h('textarea', { rows: 3, maxlength: 240 }), credit = h('input', { type: 'text', value: m.credit || '', maxlength: 80 }); alt.value = m.alt || '';
      var dot = h('i'), focal = m.focal || '50% 50%'; dot.style.left = focal.split(' ')[0]; dot.style.top = focal.split(' ')[1];
      var fw = h('div', { class: 'focal', title: 'Click to set the point that stays in view when the image is cropped', onclick: function (e) { var r = fw.getBoundingClientRect(); focal = Math.round((e.clientX - r.left) / r.width * 100) + '% ' + Math.round((e.clientY - r.top) / r.height * 100) + '%'; dot.style.left = focal.split(' ')[0]; dot.style.top = focal.split(' ')[1]; } }, h('img', { src: thumb(m), alt: '' }), dot);
      var uses = null;
      side.append(fw, h('span', { class: 'help', style: 'margin:-.6rem 0 1rem', text: 'Click the picture to set its focal point.' }),
        h('label', { class: 'f' }, h('span', { class: 'lbl', text: 'Name' }), title), h('label', { class: 'f' }, h('span', { class: 'lbl', text: 'Description for visitors who cannot see it' }), alt), h('label', { class: 'f' }, h('span', { class: 'lbl', text: 'Credit' }), credit),
        h('div', { class: 'row2' }, h('button', { class: 'b b--solid b--sm', type: 'button', text: 'Save', onclick: function () { api('PATCH', '/media/' + m.id, { title: title.value, alt: alt.value, credit: credit.value, focal: focal }).then(function (j) { Object.assign(m, j.item); toast('Saved. Live pages update on the next publish of any change.'); paint(); }).catch(function (e) { toast(e.message, true); }); } }),
          h('button', { class: 'b b--danger b--sm', type: 'button', text: 'Delete', onclick: function () { if (!confirm('Delete this image permanently?')) return; api('DELETE', '/media/' + m.id).then(function () { S.media = S.media.filter(function (x) { return x.id !== m.id; }); sel = null; paint(); toast('Image deleted.'); }).catch(function (e) { toast(e.message + (e.data && e.data.usage ? ' ' + e.data.usage.slice(0, 3).join('; ') : ''), true); }); } })));
    }
    paint(); return shell('Images', h('div', { class: 'split' }, h('div', null, drop, grid), side));
  }

  /* ---------- enquiries ---------- */
  function viewEnq() {
    var sel = null, body = h('div'), side = h('div', { class: 'panel' }), filter = 'all';
    function csv() { var cols = ['at', 'status', 'organisation', 'name', 'email', 'phone', 'role', 'division', 'material', 'volume', 'delivery_terms', 'destination', 'timing', 'services', 'notes']; var q = function (v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }; var t = cols.join(',') + '\n' + S.enq.map(function (e) { return cols.map(function (c) { return q(e[c]); }).join(','); }).join('\n'); var a = h('a', { href: URL.createObjectURL(new Blob([t], { type: 'text/csv' })), download: 'enquiries.csv' }); document.body.appendChild(a); a.click(); a.remove(); }
    function paint() {
      body.textContent = ''; var items = S.enq.filter(function (e) { return filter === 'all' || e.status === filter; });
      var tbl = h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Received', 'Organisation', 'Area', 'Status'].map(function (x) { return h('th', { text: x }); }))), h('tbody', null, items.map(function (e) { return h('tr', { class: 'row', tabindex: 0, onclick: function () { open(e); }, onkeydown: function (ev) { if (ev.key === 'Enter') open(e); } }, h('td', { text: fmt(e.at) }), h('td', null, h('strong', { text: e.organisation }), h('div', { class: 'help', text: e.name })), h('td', { text: e.division }), h('td', null, h('span', { class: 'pill ' + e.status, text: e.status }))); })));
      body.appendChild(items.length ? tbl : h('p', { class: 'msg', text: 'No enquiries here yet.' }));
      side.textContent = ''; var e = S.enq.filter(function (x) { return x.id === sel; })[0];
      if (!e) { side.appendChild(h('p', { class: 'help', text: 'Select an enquiry to read it.' })); return; }
      var rows = [['Organisation', e.organisation], ['Name', e.name], ['Email', e.email], ['Telephone', e.phone], ['Type', e.role], ['Area', e.division], ['Material', e.material], ['Quantity', e.volume], ['Terms', e.delivery_terms], ['Destination', e.destination], ['Timing', e.timing], ['Services', e.services], ['Notes', e.notes], ['NDA requested', e.confidentiality_agreement_requested]];
      var dl = h('dl', { class: 'kv' }); rows.forEach(function (r) { if (r[1]) dl.append(h('dt', { text: r[0] }), h('dd', { text: r[1] })); });
      var set = function (st) { api('PATCH', '/enquiries/' + e.id, { status: st }).then(function (j) { e.status = j.item.status; paint(); }); };
      side.append(dl, h('div', { class: 'row2', style: 'margin-top:1.2rem' }, h('a', { class: 'b b--sm b--solid', href: 'mailto:' + encodeURIComponent(e.email).replace('%40', '@') + '?subject=' + encodeURIComponent('Re: your enquiry to ' + (S.draft.site.company.name)), text: 'Reply by email', onclick: function () { if (e.status === 'new') set('replied'); } }), h('button', { class: 'b b--sm', type: 'button', text: 'Mark read', onclick: function () { set('read'); } }), h('button', { class: 'b b--sm', type: 'button', text: 'Archive', onclick: function () { set('archived'); } }), h('button', { class: 'b b--sm b--danger', type: 'button', text: 'Delete', onclick: function () { if (confirm('Delete this enquiry permanently?')) api('DELETE', '/enquiries/' + e.id).then(function () { S.enq = S.enq.filter(function (x) { return x.id !== e.id; }); sel = null; paint(); }); } })));
    }
    function open(e) { sel = e.id; if (e.status === 'new') api('PATCH', '/enquiries/' + e.id, { status: 'read' }).then(function (j) { e.status = j.item.status; paint(); }); else paint(); }
    var fsel = h('select', { class: 'in', style: 'width:auto', onchange: function () { filter = fsel.value; paint(); } }, ['all', 'new', 'read', 'replied', 'archived'].map(function (x) { return h('option', { value: x, text: x === 'all' ? 'All enquiries' : x[0].toUpperCase() + x.slice(1) }); }));
    paint(); return shell('Enquiries', h('div', null, h('div', { class: 'row2', style: 'margin-bottom:1rem' }, fsel, h('button', { class: 'b b--sm', type: 'button', text: 'Export CSV', onclick: csv })), h('div', { class: 'split' }, body, side)));
  }

  /* ---------- find & replace, versions, team, account, overview ---------- */
  function viewReplace() {
    var f = h('input', { class: 'in', type: 'text', placeholder: 'Text to find' }), r = h('input', { class: 'in', type: 'text', placeholder: 'Replace with' }), out = h('div');
    function run(apply) { api('POST', '/replace', { find: f.value, replace: r.value, apply: apply }).then(function (j) { out.textContent = ''; if (apply && j.applied) { S.hasChanges = true; return api('GET', '/content').then(function (c) { S.draft = c.draft; toast(j.count + ' change' + (j.count === 1 ? '' : 's') + ' made in the draft.'); render(); }); } out.append(h('p', { class: 'msg', text: j.count ? j.count + ' place' + (j.count === 1 ? '' : 's') + ' found.' : 'Nothing found.' }), h('ul', { class: 'chk' }, j.hits.map(function (x) { return h('li', { class: 'todo' }, h('i'), h('span', null, h('strong', { text: x.where }), h('div', { class: 'help', text: x.before }))); }))); if (j.count) out.appendChild(h('button', { class: 'b b--solid', type: 'button', style: 'margin-top:1rem', text: 'Replace all in the draft', onclick: function () { run(true); } })); }).catch(function (e) { toast(e.message, true); }); }
    return shell('Find and replace', h('div', { style: 'max-width:42rem' }, h('p', { class: 'help', style: 'margin-bottom:1rem', text: 'Search every text field in the draft, for example to change a name or a figure everywhere at once. Nothing goes live until you publish.' }), h('div', { class: 'f' }, f), h('div', { class: 'f' }, r), h('button', { class: 'b', type: 'button', text: 'Find matches', onclick: function () { run(false); } }), h('div', { style: 'margin-top:1.5rem' }, out)));
  }
  function viewVersions() {
    var box = h('div', null, h('p', { class: 'help', text: 'Loading…' }));
    api('GET', '/revisions').then(function (j) { box.textContent = ''; box.appendChild(j.items.length ? h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['When replaced', 'By', 'Note', ''].map(function (x) { return h('th', { text: x }); }))), h('tbody', null, j.items.map(function (v) { return h('tr', null, h('td', { text: fmt(v.at) }), h('td', { text: v.by }), h('td', { text: v.note || '—' }), h('td', null, h('button', { class: 'b b--sm', type: 'button', text: 'Load into draft', onclick: function () { if (!confirm('Load this earlier version into the draft? Your current draft will be replaced; nothing goes live until you publish.')) return; api('POST', '/revisions/' + v.id + '/restore').then(function (r) { S.draft = r.draft; S.hasChanges = r.hasChanges; toast('Earlier version loaded into the draft.'); location.hash = '#/overview'; render(); }); } }))); }))) : h('p', { class: 'msg', text: 'Versions appear here after the first publish.' })); });
    return shell('Published versions', h('div', null, h('p', { class: 'help', style: 'margin-bottom:1rem', text: 'Each time you publish, the version it replaces is kept here. Loading one puts it in the draft so you can review it before publishing.' }), box));
  }
  function viewAccount() {
    var err = h('p', { class: 'msg msg--bad', hidden: true }), cur = h('input', { type: 'password', autocomplete: 'current-password' }), nw = h('input', { type: 'password', autocomplete: 'new-password' });
    return shell('My account', h('form', { style: 'max-width:26rem', onsubmit: function (e) { e.preventDefault(); api('POST', '/password', { current: cur.value, next: nw.value }).then(function () { cur.value = nw.value = ''; err.hidden = true; toast('Password updated.'); }).catch(function (x) { err.textContent = x.message; err.hidden = false; }); } }, h('p', { class: 'help', style: 'margin-bottom:1rem', text: 'Signed in as ' + S.user.username + ' (' + S.user.role + '). Changing your password signs out your other sessions.' }), err, h('label', { class: 'f' }, h('span', { class: 'lbl', text: 'Current password' }), cur), h('label', { class: 'f' }, h('span', { class: 'lbl', text: 'New password' }), nw, h('span', { class: 'help', text: 'At least 12 characters, with letters and a number.' })), h('button', { class: 'b b--solid', type: 'submit', text: 'Change password' })));
  }
  function viewTeam() {
    var box = h('div'), log = h('div');
    function load() {
      api('GET', '/users').then(function (j) { box.textContent = ''; box.appendChild(h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Name', 'Username', 'Role', ''].map(function (x) { return h('th', { text: x }); }))), h('tbody', null, j.items.map(function (u) { return h('tr', null, h('td', { text: u.name }), h('td', { text: u.username }), h('td', { text: u.role }), h('td', null, u.id === S.user.id ? null : h('div', { class: 'row2' }, h('button', { class: 'b b--sm', type: 'button', text: 'Reset password', onclick: function () { var pw = prompt('Temporary password for ' + u.username + ' (12+ characters, letters and a number). They must change it at next sign-in.'); if (pw) api('POST', '/users/' + u.id + '/reset', { password: pw }).then(function () { toast('Password reset.'); }).catch(function (e) { toast(e.message, true); }); } }), h('button', { class: 'b b--sm b--danger', type: 'button', text: 'Remove', onclick: function () { if (confirm('Remove ' + u.username + '?')) api('DELETE', '/users/' + u.id).then(load).catch(function (e) { toast(e.message, true); }); } })))); })))); });
      api('GET', '/audit').then(function (j) { log.textContent = ''; log.appendChild(h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['When', 'Who', 'What'].map(function (x) { return h('th', { text: x }); }))), h('tbody', null, j.items.slice(0, 40).map(function (a) { return h('tr', null, h('td', { text: fmt(a.at) }), h('td', { text: a.user }), h('td', { text: a.action + (a.detail ? ' · ' + a.detail : '') })); })))); });
    }
    var un = h('input', { class: 'in', type: 'text', placeholder: 'username', autocapitalize: 'none' }), nm = h('input', { class: 'in', type: 'text', placeholder: 'Full name' }), pw = h('input', { class: 'in', type: 'text', placeholder: 'Temporary password', autocomplete: 'off' }), rl = h('select', { class: 'in' }, h('option', { value: 'editor', text: 'Editor — content, images, enquiries' }), h('option', { value: 'admin', text: 'Administrator — everything, plus team' }));
    load();
    return shell('Team and activity', h('div', null, h('h2', { class: 'sec', style: 'margin-top:0', text: 'Staff accounts' }), box, h('h2', { class: 'sec', text: 'Add a person' }), h('div', { class: 'row2', style: 'max-width:50rem' }, un, nm, pw, rl, h('button', { class: 'b b--solid', type: 'button', text: 'Add', onclick: function () { api('POST', '/users', { username: un.value, name: nm.value, password: pw.value, role: rl.value }).then(function () { un.value = nm.value = pw.value = ''; toast('Account created. They will choose a new password at first sign-in.'); load(); }).catch(function (e) { toast(e.message, true); }); } })), h('h2', { class: 'sec', text: 'Recent activity' }), log));
  }
  function viewOverview() {
    var c = S.draft.site, undescribed = S.media.filter(function (m) { return !m.alt; }).length;
    var todo = [
      [!c.contact.address, 'Add the office address', 'page/site'], [!c.company.registered, 'Add the registered company name and number', 'page/site'],
      [/example\.com/.test(c.contact.email), 'Replace the placeholder email address', 'page/site'], [/example\.com/.test(c.seo.domain), 'Set the real website address', 'page/site'],
      [!c.contact.response, 'State a reply time for enquiries (optional)', 'page/site'], [undescribed > 0, undescribed + ' image' + (undescribed === 1 ? '' : 's') + ' still need a description for accessibility', 'media']];
    var cards = h('div', { class: 'cards' },
      h('div', { class: 'card' }, h('span', { class: 'lbl', text: 'Website' }), h('div', { class: 'k', text: S.hasChanges ? 'Draft' : 'Live' }), h('span', { class: 'help', text: S.hasChanges ? 'You have unpublished changes.' : (S.publishedAt ? 'Last published ' + fmt(S.publishedAt) : 'Showing the original content.') })),
      h('div', { class: 'card' }, h('span', { class: 'lbl', text: 'New enquiries' }), h('div', { class: 'k', text: String(newCount()) }), h('a', { href: '#/enquiries', text: 'Open the inbox' })),
      h('div', { class: 'card' }, h('span', { class: 'lbl', text: 'Images' }), h('div', { class: 'k', text: String(S.media.length) }), h('a', { href: '#/media', text: 'Open the library' })));
    return shell('Overview', h('div', { style: 'max-width:60rem' }, cards, h('h2', { class: 'sec', text: 'Before launch' }), h('ul', { class: 'chk' }, todo.map(function (t) { return h('li', { class: t[0] ? 'todo' : 'done' }, h('i'), t[0] ? h('a', { href: '#/' + t[2], text: t[1] }) : h('span', { text: t[1].replace(/^Add|^Replace|^Set|^State/, function (m) { return { Add: 'Added', Replace: 'Replaced', Set: 'Set', State: 'Stated' }[m]; }) + ' ✓' })); })),
      h('h2', { class: 'sec', text: 'How publishing works' }), h('p', { class: 'help', style: 'font-size:.95rem;max-width:40rem', text: 'Edit any page from the list on the left. Your changes are saved as a draft and shown in the preview beside the form. When you are happy, press Publish and the live pages update straight away. The previous version is always kept.' })));
  }

  /* ---------- boot / render ---------- */
  function render() {
    previewFrame = null; root.textContent = '';
    if (!S.user) { document.title = 'Staff sign in'; root.appendChild(viewLogin()); return; }
    if (S.user.mustChange) { root.appendChild(viewMustChange()); return; }
    var r = route(), v;
    switch (r[0]) { case 'page': v = viewPage(r[1]); break; case 'media': v = viewMedia(); break; case 'enquiries': v = viewEnq(); break; case 'replace': v = viewReplace(); break; case 'versions': v = viewVersions(); break; case 'team': v = S.user.role === 'admin' ? viewTeam() : viewOverview(); break; case 'account': v = viewAccount(); break; default: v = viewOverview(); }
    document.title = 'Site editor'; root.appendChild(v);
  }
  function boot() {
    return api('GET', '/session').then(function (s) {
      S.user = s.user; S.csrf = s.csrf; if (S.user.mustChange) return render();
      return Promise.all([api('GET', '/content'), api('GET', '/enquiries')]).then(function (r) { var c = r[0]; S.schema = c.schema; S.draft = c.draft; S.published = c.published; S.media = c.media; S.hasChanges = c.hasChanges; S.publishedAt = c.publishedAt; S.enq = r[1].items; render(); });
    }).catch(function () { S.user = null; render(); });
  }
  window.addEventListener('hashchange', function () { if (S.user && !S.user.mustChange) { if (route()[0] === 'enquiries') api('GET', '/enquiries').then(function (r) { S.enq = r.items; render(); }); else render(); } });
  boot();
})();
