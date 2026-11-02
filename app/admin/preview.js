// Runs inside the editor's preview frame: keeps links inside the preview and reports scroll back.
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
  var h = a.getAttribute('href');
  if (h.charAt(0) === '/' && h.indexOf('//') !== 0) { e.preventDefault(); var base = location.pathname.replace(/\/preview.*$/, ''); location.href = base + '/preview' + h; }
  else if (/^https?:/i.test(h)) { e.preventDefault(); }
});
document.addEventListener('submit', function (e) { e.preventDefault(); });
