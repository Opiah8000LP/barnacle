/* ==========================================================================
   search.js — one search to rule them all.
   Indexes every section, year page, block and list item (censored bits are
   skipped, the letter's secret is never in the data in the first place).
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW;
  var h = RDW.h;

  var index = [];
  var dirty = true;
  var sources = [];              // extra index sources (the dashboard registers one)
  var SKIP_KEYS = { id: 1, type: 1, src: 1, image: 1, cover: 1, file: 1, archived: 1, hint: 1, group: 1, answer: 1, cipher: 1, icon: 1, layout: 1, order: 1, hex: 1, href: 1, link: 1 };

  function fold(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function collect(v, out) {
    if (v === null || v === undefined) return;
    if (typeof v === 'string') { var p = RDW.plain(v).trim(); if (p) out.push(p); }
    else if (typeof v === 'number') out.push(String(v));
    else if (Array.isArray(v)) v.forEach(function (x) { collect(x, out); });
    else if (typeof v === 'object') Object.keys(v).forEach(function (k) { if (!SKIP_KEYS[k]) collect(v[k], out); });
  }

  function blockEntry(sec, page, b) {
    var parts = [];
    if (b.type === 'letter') { /* the title only. Never anything else. */ }
    else collect(b, parts);
    var title = b.title || '';
    // collect() also grabs the title; strip it so title is weighed separately
    var raw = parts.join(' · ');
    return {
      sectionId: sec.id, sectionTitle: sec.title,
      pageId: page ? page.id : null, pageTitle: page ? page.title : '',
      blockId: b.id, title: title, group: b.group || '',
      raw: raw, hay: fold(title + ' ' + (b.group || '') + ' ' + raw), titleHay: fold(title)
    };
  }

  function build() {
    index = [];
    RDW.nav.list(false).forEach(function (s) {
      var doc = RDW.store.get(s.id);
      if (!doc) return;
      (doc.blocks || []).forEach(function (b) { if (!b.archived) index.push(blockEntry(s, null, b)); });
      (doc.pages || []).forEach(function (p) {
        if (p.archived) return;
        (p.blocks || []).forEach(function (b) { if (!b.archived) index.push(blockEntry(s, p, b)); });
      });
    });
    sources.forEach(function (fn) { try { fn().forEach(function (e) { e.hay = fold(e.title + ' ' + e.raw); e.titleHay = fold(e.title); index.push(e); }); } catch (err) { console.error(err); } });
    dirty = false;
  }

  function tokens(q) { return fold(q).split(/\s+/).filter(Boolean); }

  function query(q) {
    if (dirty) build();
    var toks = tokens(q);
    if (!toks.length) return [];
    var out = [];
    index.forEach(function (e) {
      var score = 0;
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i];
        if (e.hay.indexOf(t) === -1) return;
        score += 1;
        if (e.titleHay.indexOf(t) !== -1) score += 8;
        if (new RegExp('\\b' + RDW.esc(t)).test(e.hay)) score += 2;
      }
      if (toks.length > 1 && e.hay.indexOf(toks.join(' ')) !== -1) score += 6;
      out.push({ entry: e, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 40).map(function (r) { return r.entry; });
  }

  function snippet(raw, toks) {
    var f = fold(raw), pos = -1;
    for (var i = 0; i < toks.length; i++) { var p = f.indexOf(toks[i]); if (p !== -1 && (pos === -1 || p < pos)) pos = p; }
    if (pos === -1) return raw.slice(0, 110);
    var start = Math.max(0, pos - 40), end = Math.min(raw.length, pos + 90);
    return (start > 0 ? '…' : '') + raw.slice(start, end) + (end < raw.length ? '…' : '');
  }

  function markInto(el, text, toks) {
    var re = toks.length ? new RegExp('(' + toks.map(RDW.esc).join('|') + ')', 'ig') : null;
    if (!re) { el.textContent = text; return el; }
    var last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
      el.appendChild(h('mark', null, m[0]));
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
    return el;
  }

  /* ---- highlighting inside the page ---------------------------------------- */
  function clearHighlight(root) {
    RDW.$$('mark.hit', root || document).forEach(function (m) {
      var p = m.parentNode; if (!p) return;
      p.replaceChild(document.createTextNode(m.textContent), m); p.normalize();
    });
    RDW.$$('.is-hit-block', root || document).forEach(function (b) { b.classList.remove('is-hit-block'); });
    var btn = document.getElementById('btn-hl-clear'); if (btn) btn.hidden = true;
  }

  function highlight(root, q) {
    clearHighlight(root);
    var toks = fold(q).split(/\s+/).filter(Boolean);
    if (!toks.length || !root) return [];
    // match against the original text, case-insensitively (diacritics: good enough)
    var re = new RegExp('(' + toks.map(RDW.esc).join('|') + ')', 'ig');
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (p.closest && p.closest('.censor, script, style, mark, textarea, input, [data-no-hit]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    var marks = [];
    nodes.forEach(function (node) {
      var text = node.nodeValue; re.lastIndex = 0;
      if (!re.test(text)) return;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment(), last = 0, m;
      while ((m = re.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var mk = h('mark', { class: 'hit' }, m[0]); marks.push(mk); frag.appendChild(mk);
        last = m.index + m[0].length; if (m[0].length === 0) re.lastIndex++;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
    // open any <details> / expanders that hide a hit
    marks.forEach(function (mk) {
      var d = mk.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
      var more = mk.closest('.more-body'); if (more && more.hidden) { more.hidden = false; var t = more.previousElementSibling; if (t && t.setAttribute) { t.setAttribute('aria-expanded', 'true'); } }
    });
    if (marks.length) { var btn = document.getElementById('btn-hl-clear'); if (btn) btn.hidden = false; }
    return marks;
  }

  /* ---- the search box UI ------------------------------------------------------ */
  function attach(opts) {
    var input = opts.input, box = opts.results, sel = -1, shown = [], jumpT;
    var idBase = RDW.uid('res');

    function close() { box.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); sel = -1; }
    function pick(e) {
      close();
      RDW.sfx && RDW.sfx.play('open');
      RDW.router.go(e.sectionId, { page: e.pageId, block: e.blockId, q: input.value.trim() });
      if (opts.onPick) opts.onPick(e);
    }
    function select(i) {
      var items = RDW.$$('.result', box);
      items.forEach(function (it, k) { it.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      sel = i;
      if (items[i]) { input.setAttribute('aria-activedescendant', items[i].id); items[i].scrollIntoView({ block: 'nearest' }); }
    }
    function render() {
      var q = input.value.trim();
      RDW.clear(box);
      if (!q) { close(); return; }
      shown = query(q);
      var toks = tokens(q);
      if (!shown.length) {
        box.appendChild(h('p', { class: 'result-empty' }, 'Nothing matched "' + q + '". Spelling is hard, I get it.'));
      } else {
        var lastGroup = null, i = 0;
        shown.forEach(function (e) {
          var groupLabel = e.sectionTitle + (e.pageTitle ? ' › ' + e.pageTitle : '');
          if (groupLabel !== lastGroup) { box.appendChild(h('p', { class: 'result-group', role: 'presentation' }, groupLabel)); lastGroup = groupLabel; }
          var idx = i++;
          var title = h('span', { class: 'result-title' });
          markInto(title, e.title || '(untitled)', toks);
          var snip = h('span', { class: 'result-snippet' });
          markInto(snip, snippet(e.raw, toks), toks);
          box.appendChild(h('button', { type: 'button', class: 'result', role: 'option', id: idBase + '-' + idx, 'aria-selected': 'false',
            onClick: function () { pick(e); }, onMouseenter: function () { select(idx); } }, title, snip));
        });
      }
      box.hidden = false; input.setAttribute('aria-expanded', 'true'); sel = -1;
      RDW.announce(shown.length + ' result' + (shown.length === 1 ? '' : 's'));
      clearTimeout(jumpT);
      if (RDW.settings.get('autoJump') && shown.length) jumpT = setTimeout(function () { if (input.value.trim() === q) { RDW.router.go(shown[0].sectionId, { page: shown[0].pageId, block: shown[0].blockId, q: q }); } }, 800);
    }
    var renderSoon = RDW.debounce(render, 110);

    input.addEventListener('input', renderSoon);
    input.addEventListener('focus', function () { if (input.value.trim()) render(); });
    input.addEventListener('keydown', function (ev) {
      var n = RDW.$$('.result', box).length;
      if (ev.key === 'ArrowDown') { if (box.hidden) render(); else if (n) select((sel + 1) % n); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { if (n) select((sel - 1 + n) % n); ev.preventDefault(); }
      else if (ev.key === 'Enter') {
        ev.preventDefault();
        if (box.hidden || !shown.length) { render(); }
        if (!shown.length) return;
        pick(shown[sel >= 0 ? sel : 0]);
        if (RDW.isMobile()) input.blur();
      }
      else if (ev.key === 'Escape') {
        if (!box.hidden) { close(); ev.stopPropagation(); }
        else if (input.value) { input.value = ''; RDW.search.clearHighlight(); ev.stopPropagation(); }
        else input.blur();
      }
    });
    document.addEventListener('pointerdown', function (ev) { if (!box.contains(ev.target) && ev.target !== input) close(); });
    return { close: close, refresh: render, input: input };
  }

  RDW.search = {
    invalidate: function () { dirty = true; },
    addSource: function (fn) { sources.push(fn); dirty = true; },
    query: query, attach: attach, highlight: highlight, clearHighlight: clearHighlight, tokens: tokens,
    markInto: markInto
  };

  RDW.store.onChange(function () { dirty = true; });
})();
