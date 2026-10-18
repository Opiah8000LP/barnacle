/* ==========================================================================
   router.js — hash routes that survive refreshes and the back button.

     #/identity                section
     #/identity/full-name      section + block (scrolls there)
     #/years/2026              year page
     #/years/2026/summary      year page + block
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW;
  var listeners = [];
  var current = { section: 'home', page: null, block: null, q: '' };
  var pendingQuery = '';

  function parse(hash) {
    var parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    var r = { section: parts[0] || 'home', page: null, block: null, q: '' };
    var sec = RDW.nav && RDW.nav.find(r.section);
    if (sec && sec.layout === 'years') { r.page = parts[1] || null; r.block = parts[2] || null; }
    else r.block = parts[1] || null;
    return r;
  }
  function build(r) {
    var segs = [r.section];
    if (r.page) segs.push(r.page);
    if (r.block) segs.push(r.block);
    return '#/' + segs.map(encodeURIComponent).join('/');
  }

  function fire(opts) {
    current.q = pendingQuery; pendingQuery = '';
    listeners.slice().forEach(function (fn) { fn(Object.assign({}, current), opts || {}); });
  }

  RDW.router = {
    current: function () { return Object.assign({}, current); },
    onRoute: function (fn) { listeners.push(fn); },
    href: build,
    /** go('identity', {block:'full-name', q:'cat'}) */
    go: function (section, opts) {
      opts = opts || {};
      var next = { section: section || 'home', page: opts.page || null, block: opts.block || null };
      pendingQuery = opts.q || '';
      var h = build(next);
      if (location.hash === h) { current = Object.assign(next, { q: '' }); fire({ same: true }); }
      else location.hash = h;   // hashchange takes it from here
    },
    start: function () {
      window.addEventListener('hashchange', function () { current = parse(location.hash); fire({}); });
      current = parse(location.hash);
      fire({ initial: true });
    }
  };
})();
