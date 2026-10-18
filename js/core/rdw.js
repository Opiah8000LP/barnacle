/* ==========================================================================
   rdw.js — the tiny toolbox everything else borrows from.
   DOM helper, storage, rich text (with the <Secret&N> censor trick), toasts.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = (window.RDW = window.RDW || {});
  RDW.VERSION = '1.0.0';
  var NS = 'rdweeb:';

  /* ---- DOM ---------------------------------------------------------------- */
  RDW.$ = function (sel, root) { return (root || document).querySelector(sel); };
  RDW.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }

  /** h('div', {class:'x', onClick: fn}, 'text', childNode, [more]) */
  RDW.h = function (tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (k === 'style' && typeof v === 'object') {
          Object.keys(v).forEach(function (p) { if (p.slice(0, 2) === '--') el.style.setProperty(p, v[p]); else el.style[p] = v[p]; });
        }
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'text') el.textContent = v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };

  RDW.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* ---- small helpers ------------------------------------------------------ */
  RDW.uid = function (prefix) { return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 8); };
  RDW.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  RDW.clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };
  RDW.slug = function (s) { return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || RDW.uid('item'); };
  RDW.esc = function (s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  RDW.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };
  RDW.hash = function (str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h >>> 0); };
  RDW.motionOK = function () { return document.documentElement.getAttribute('data-motion') !== 'reduced'; };
  RDW.isMobile = function () { return window.matchMedia('(max-width: 900px)').matches; };
  RDW.asArray = function (v) { return Array.isArray(v) ? v : (v === undefined || v === null || v === '' ? [] : [v]); };

  RDW.download = function (filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  };

  /* ---- storage (never throws, because private windows are chaos) ----------- */
  RDW.storage = {
    get: function (k, fallback) { try { var v = localStorage.getItem(NS + k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set: function (k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove: function (k) { try { localStorage.removeItem(NS + k); } catch (e) { /* shrug */ } },
    keys: function (prefix) {
      var out = [];
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(NS + (prefix || '')) === 0) out.push(k.slice(NS.length)); } } catch (e) { /* shrug */ }
      return out;
    }
  };

  /* ---- dates -------------------------------------------------------------- */
  RDW.fmt = {
    date: function (d) { return new Intl.DateTimeFormat(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d || new Date()); },
    shortDate: function (d) { return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(d || new Date()); },
    time: function (d) { return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d || new Date()); },
    /** '2026-03' -> 'March 2026', '2026-03-09' -> '9 March 2026', anything else is returned untouched */
    nice: function (s) {
      if (!s) return '';
      var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(s).trim());
      if (!m) return String(s);
      var d = new Date(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : 1);
      if (isNaN(d)) return String(s);
      return new Intl.DateTimeFormat(undefined, m[3] ? { year: 'numeric', month: 'long', day: 'numeric' } : { year: 'numeric', month: 'long' }).format(d);
    },
    monthNow: function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); },
    number: function (n) { return new Intl.NumberFormat().format(n); }
  };

  /* ---- toasts + screen-reader announcements -------------------------------- */
  RDW.toast = function (msg, ms) {
    var box = document.getElementById('toasts'); if (!box) return;
    var t = RDW.h('div', { class: 'toast', role: 'status' }, msg);
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 3600);
  };
  RDW.announce = function (msg) {
    var l = document.getElementById('live'); if (!l) return;
    l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30);
  };

  /* ---- rich text ------------------------------------------------------------
     Supports, in this order of importance:
       <Secret&4>        a black bar that is 4 characters wide. The real word is NEVER stored.
       [label](https://) a link
       **bold**  *italic*
     Everything is built with DOM nodes (no innerHTML), so no funny business.
  --------------------------------------------------------------------------- */
  var TOKEN = /<Secret&(\d{1,3})>|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;
  RDW.CENSOR_RE = /<Secret&(\d{1,3})>/g;

  function safeHref(u) {
    if (/^(https?:|mailto:)/i.test(u)) return u;
    if (/^(\.{0,2}\/|#|[\w-]+\/|[\w-]+\.\w+$)/.test(u) && !/^\w+:/.test(u)) return u;
    return null;
  }

  RDW.censorBar = function (n) {
    n = RDW.clamp(parseInt(n, 10) || 1, 1, 200);
    return RDW.h('span', { class: 'censor', style: { '--n': n }, role: 'img', 'aria-label': 'redacted, ' + n + ' characters', title: 'Redacted' });
  };

  RDW.rich = function (text) {
    var frag = document.createDocumentFragment();
    var s = String(text === undefined || text === null ? '' : text);
    var last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(s))) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      if (m[1]) frag.appendChild(RDW.censorBar(m[1]));
      else if (m[2]) {
        var href = safeHref(m[3]);
        if (href) frag.appendChild(RDW.h('a', { href: href, target: /^https?:/i.test(href) ? '_blank' : null, rel: 'noopener noreferrer' }, m[2]));
        else frag.appendChild(document.createTextNode(m[0]));
      }
      else if (m[4]) frag.appendChild(RDW.h('strong', null, m[4]));
      else if (m[5]) frag.appendChild(RDW.h('em', null, m[5]));
      last = m.index + m[0].length;
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    return frag;
  };

  /** Plain text for the search index: censor tokens vanish, markdown-ish bits are flattened. */
  RDW.plain = function (text) {
    return String(text === undefined || text === null ? '' : text)
      .replace(RDW.CENSOR_RE, ' ')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
  };

  /** One <p> per string. Empty strings are skipped. */
  RDW.paragraphs = function (arr, cls) {
    return RDW.asArray(arr).filter(function (p) { return String(p).trim() !== ''; }).map(function (p) {
      return RDW.h('p', { class: cls || null, style: { whiteSpace: 'pre-wrap' } }, RDW.rich(p));
    });
  };

  /** Turns a path like 'cat.png' into 'images/identity/cat.png' unless it already looks like a path or URL. */
  RDW.resolveAsset = function (src, folder) {
    var s = String(src || '').trim();
    if (!s) return '';
    if (/^(https?:|data:|blob:|\/|\.{1,2}\/)/i.test(s) || s.indexOf('/') !== -1) return s;
    return (folder ? folder.replace(/\/?$/, '/') : '') + s;
  };
})();
