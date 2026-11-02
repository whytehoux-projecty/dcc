(function () {
  'use strict';
  var d = document, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* header state + mobile menu */
  var bar = $('[data-bar]'), burger = $('.menu-btn'), drawer = $('#drawer');
  function stuck() { bar.classList.toggle('scrolled', window.scrollY > 8); }
  stuck(); window.addEventListener('scroll', stuck, { passive: true });
  function setDrawer(open) { burger.setAttribute('aria-expanded', String(open)); drawer.classList.toggle('open', open); }
  burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('open')); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) { setDrawer(false); burger.focus(); } });
  $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
  window.matchMedia('(min-width: 961px)').addEventListener('change', function (m) { if (m.matches) setDrawer(false); });

  /* reveal on scroll */
  var targets = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  } else { targets.forEach(function (t) { t.classList.add('in'); }); }

  /* method: stage tabs */
  var method = $('[data-method]');
  if (method) {
    var tabs = $$('[role=tab]', method), pans = $$('[role=tabpanel]', method);
    var select = function (i, focus) {
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      pans.forEach(function (p, k) { p.hidden = k !== i; });
      if (focus) tabs[i].focus();
    };
    select(0);
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, k = i;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') k = (i + 1) % n;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') k = (i + n - 1) % n;
        else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = n - 1; else return;
        e.preventDefault(); select(k, true);
      });
    });
  }

  /* enquiry form */
  var form = $('#enquiry-form');
  if (!form) return;
  var cfg = {}; try { cfg = JSON.parse($('#dc-config').textContent); } catch (e) {}
  var CONFIG = {
    'Rare earths & critical minerals': { label: 'Material', items: ['NdPr oxide or metal', 'Dysprosium / terbium oxides', 'Tantalum / niobium concentrate', 'Tungsten concentrate (wolframite / scheelite)', 'Titanium feedstock (rutile / ilmenite)', 'Lithium or cobalt intermediates', 'Mixed rare earth carbonate (MREC)', 'Other (describe in notes)'], units: ['Metric tonnes', 'Kilograms', '20ft containers'], terms: ['FOB (sea)', 'CFR (sea)', 'CIF (sea)', 'FCA (any mode)', 'CIP (any mode)', 'DAP (any mode)', 'Not sure — advise me'] },
    'Crude oil & petroleum products': { label: 'Grade or product', items: ['Light sweet crude', 'Medium or heavy crude', 'Condensate', 'Diesel (e.g. EN 590)', 'Jet A-1', 'Fuel oil', 'Other (describe in notes)'], units: ['Barrels', 'Metric tonnes', 'Cubic metres'], terms: ['FOB (loading terminal)', 'CFR (discharge port)', 'CIF (discharge port)', 'DAP (delivered at place)', 'Not sure — advise me'] },
    'Gemstones': { label: 'Stone type and form', items: ['Rough diamonds', 'Polished diamonds', 'Emerald, ruby or sapphire (rough or cut)', 'Other coloured stones (tourmaline, aquamarine, garnet…)', 'Industrial or optical crystals', 'Other (describe in notes)'], units: ['Carats', 'Grams', 'Kilograms'], terms: ['FCA (any mode)', 'CIP (any mode)', 'DAP (any mode)', 'Not sure — advise me'] },
    'Other materials': { label: 'Material', items: ['Copper cathode', 'Gold doré', 'Platinum group metals', 'Manganese, chrome or bauxite', 'Other (describe in notes)'], units: ['Metric tonnes', 'Kilograms', 'Troy ounces', 'Other (state in notes)'], terms: ['FOB (sea)', 'CFR (sea)', 'CIF (sea)', 'FCA (any mode)', 'CIP (any mode)', 'DAP (any mode)', 'Not sure — advise me'] }
  };
  var f = function (n) { return form.elements[n]; };
  var status = $('#form-status');
  function fill(sel, vals) { sel.textContent = ''; vals.forEach(function (v) { var o = d.createElement('option'); o.value = o.textContent = v; sel.appendChild(o); }); }
  function sync() { var c = CONFIG[f('division').value] || CONFIG['Rare earths & critical minerals']; $('#f-item-label').textContent = c.label; fill(f('material'), c.items); fill(f('unit'), c.units); fill(f('terms'), c.terms); }
  var pre = new URLSearchParams(location.search).get('division'); if (pre && CONFIG[pre]) f('division').value = pre;
  sync(); f('division').addEventListener('change', sync);
  function say(kind, msg) { status.className = 'status ' + kind; status.textContent = msg; status.tabIndex = -1; status.focus(); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (f('website').value) return;
    $$('.bad', form).forEach(function (x) { x.classList.remove('bad'); });
    var invalid = $$('input,select,textarea', form).filter(function (x) { return x.willValidate && !x.checkValidity(); });
    if (invalid.length) { invalid.forEach(function (x) { x.classList.add('bad'); }); invalid[0].focus(); say('err', 'Please complete the highlighted fields.'); return; }
    var data = {
      organisation: f('organisation').value, role: f('role').value, name: f('name').value, email: f('email').value, phone: f('phone').value,
      division: f('division').value, material: f('material').value, volume: f('volume').value + ' ' + f('unit').value,
      delivery_terms: f('terms').value, destination: f('destination').value, timing: f('timing').value,
      services: $$('input[name=services]:checked', form).map(function (x) { return x.value; }).join(', ') || 'Not specified',
      notes: f('notes').value || 'None', confidentiality_agreement_requested: f('nda').checked ? 'Yes' : 'No', website: ''
    };
    var btn = $('button[type=submit]', form); btn.disabled = true;
    fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function () { form.reset(); sync(); say('ok', cfg.success || 'Thank you. Your enquiry has been received.'); })
      .catch(function () {
        // No server reachable (for example on a static copy): hand the enquiry to the visitor's mail app.
        var body = Object.keys(data).filter(function (k) { return k !== 'website'; }).map(function (k) { return k.replace(/_/g, ' ') + ': ' + data[k]; }).join('\n');
        location.href = 'mailto:' + cfg.email + '?subject=' + encodeURIComponent('Enquiry: ' + data.division + ' — ' + data.organisation) + '&body=' + encodeURIComponent(body);
        say('ok', 'Your email app should now open with the enquiry filled in. Nothing is sent until you press Send there. If it did not open, write to ' + cfg.email + '.');
      })
      .then(function () { btn.disabled = false; });
  });
})();
