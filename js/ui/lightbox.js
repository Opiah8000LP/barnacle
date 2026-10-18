/* ==========================================================================
   lightbox.js — full-size image viewer. Arrow keys, swipe, Esc, zoom.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW; var h = RDW.h;

  function open(items, start, trigger) {
    if (!items || !items.length) return;
    var idx = RDW.clamp(start || 0, 0, items.length - 1);
    var zoomed = false;

    var img = h('img', { class: 'lb-img', alt: '' });
    var missing = h('div', { class: 'lb-missing', hidden: true });
    var cap = h('div', { class: 'lb-cap', 'aria-live': 'polite' });
    var count = h('span', { class: 'lb-count' });
    var stage = h('div', { class: 'lb-stage' }, img, missing);
    var prev = h('button', { type: 'button', class: 'iconbtn lb-nav lb-prev', 'aria-label': 'Previous image', onClick: function () { go(-1); } }, '‹');
    var next = h('button', { type: 'button', class: 'iconbtn lb-nav lb-next', 'aria-label': 'Next image', onClick: function () { go(1); } }, '›');
    var zoom = h('button', { type: 'button', class: 'btn btn--small', 'aria-pressed': 'false', onClick: toggleZoom }, 'Zoom');
    var close = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Close viewer', onClick: done }, '✕');
    var root = h('div', { class: 'lb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Image viewer' },
      h('div', { class: 'lb-bar' }, count, h('span', { class: 'lb-spacer' }), zoom, close), stage, prev, next, cap);

    function show() {
      var it = items[idx];
      zoomed = false; stage.classList.remove('is-zoom'); zoom.setAttribute('aria-pressed', 'false');
      missing.hidden = true; img.hidden = false; img.alt = it.caption || '';
      img.onerror = function () { img.hidden = true; missing.hidden = false; RDW.clear(missing); missing.appendChild(h('strong', null, 'Image not found')); missing.appendChild(h('span', null, it.file || it.src)); };
      img.src = it.src;
      count.textContent = (idx + 1) + ' / ' + items.length;
      RDW.clear(cap);
      if (it.caption) cap.appendChild(h('strong', null, RDW.rich(it.caption)));
      if (it.date) cap.appendChild(h('span', { class: 'muted' }, ' · ' + RDW.fmt.nice(it.date)));
      if (it.description) cap.appendChild(h('p', null, RDW.rich(it.description)));
      prev.hidden = next.hidden = items.length < 2;
      // preload neighbours
      [idx - 1, idx + 1].forEach(function (n) { if (items[n]) { var p = new Image(); p.src = items[n].src; } });
    }
    function go(d) { idx = (idx + d + items.length) % items.length; show(); }
    function toggleZoom() { zoomed = !zoomed; stage.classList.toggle('is-zoom', zoomed); zoom.setAttribute('aria-pressed', String(zoomed)); }
    function done() {
      document.removeEventListener('keydown', onKey, true);
      root.remove(); document.body.classList.remove('lb-open');
      if (trigger && document.body.contains(trigger)) trigger.focus();
    }
    function onKey(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done(); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); ev.stopPropagation(); go(-1); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); ev.stopPropagation(); go(1); }
      else if (ev.key === 'z' || ev.key === 'Z') { toggleZoom(); }
      else if (ev.key === 'Tab') {
        var f = RDW.$$('button:not([hidden])', root); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    }

    // swipe
    var sx = null;
    stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 60 && !zoomed) go(dx < 0 ? 1 : -1); }, { passive: true });
    root.addEventListener('mousedown', function (e) { if (e.target === root || e.target === stage) done(); });

    document.body.appendChild(root); document.body.classList.add('lb-open');
    document.addEventListener('keydown', onKey, true);
    show(); close.focus();
  }

  RDW.lightbox = { open: open };
})();
