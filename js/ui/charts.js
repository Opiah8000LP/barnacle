/* ==========================================================================
   charts.js — hand-drawn SVG charts. No chart library, no dependencies.
   Every chart: updates when the numbers change, works with keyboard, has a
   data-table twin for screen readers, and uses hatch PATTERNS as well as
   shapes so nothing depends on telling greys apart.

   Metric shape (see data/sections/home.js):
     { id, label, group, unit, goal, goalScope:'all'|'year',
       values: [ {period:'2025', value:12}, {period:'2026-03', value:2} ] }
   Use years ("2025") OR months ("2025-03") — just stay consistent per metric.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW; var h = RDW.h;
  var NS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c) el.appendChild(c.nodeType ? c : document.createTextNode(c)); }
    return el;
  }
  function remPx() { return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; }

  /* ---- data helpers --------------------------------------------------------- */
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function allPeriods(metrics) {
    var set = {}; metrics.forEach(function (m) { (m.values || []).forEach(function (v) { if (String(v.period).trim()) set[String(v.period).trim()] = 1; }); });
    return Object.keys(set).sort();
  }
  function allYears(metrics) {
    var set = {}; allPeriods(metrics).forEach(function (p) { set[p.slice(0, 4)] = 1; });
    return Object.keys(set).sort();
  }
  function valueFor(m, filter) {
    return (m.values || []).reduce(function (sum, v) { return sum + ((!filter || filter === 'all' || String(v.period).indexOf(filter) === 0) ? num(v.value) : 0); }, 0);
  }
  function valueAt(m, period) { return (m.values || []).reduce(function (sum, v) { return sum + (String(v.period).trim() === period ? num(v.value) : 0); }, 0); }
  function hasData(metrics) { return metrics.some(function (m) { return valueFor(m, 'all') > 0; }); }
  function niceMax(max) {
    if (max <= 0) return 4;
    var exp = Math.pow(10, Math.floor(Math.log10(max))), f = max / exp;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * exp;
  }
  function fmt(n) { return RDW.fmt.number(Math.round(n * 100) / 100); }

  /* ---- patterns (defined once, referenced everywhere) ------------------------- */
  var PATTERN_COUNT = 6;
  function patternDefs() {
    var svg = s('svg', { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false', style: 'position:absolute' });
    var defs = s('defs'); svg.appendChild(defs);
    function ink(el) { el.setAttribute('style', 'stroke:var(--ink);fill:none;stroke-width:1.6'); return el; }
    function pat(i, kids) {
      var p = s('pattern', { id: 'rdw-pat-' + i, width: '8', height: '8', patternUnits: 'userSpaceOnUse' });
      p.appendChild(s('rect', { width: '8', height: '8', style: 'fill:var(--card)' }));
      kids.forEach(function (k) { p.appendChild(k); }); defs.appendChild(p);
    }
    pat(1, [ink(s('path', { d: 'M-2 2l4-4M0 8l8-8M6 10l4-4' }))]);                                // diagonal
    pat(2, [s('circle', { cx: '2', cy: '2', r: '1.3', style: 'fill:var(--ink)' }), s('circle', { cx: '6', cy: '6', r: '1.3', style: 'fill:var(--ink)' })]); // dots
    pat(3, [ink(s('path', { d: 'M0 0l8 8M8 0L0 8' }))]);                                          // cross
    pat(4, [ink(s('path', { d: 'M0 2h8M0 6h8' }))]);                                              // horizontal
    pat(5, [ink(s('path', { d: 'M2 0v8M6 0v8' }))]);                                              // vertical
    return svg;
  }
  var GREYS = [1, 0.72, 0.52, 0.38, 0.26, 0.16];
  function paint(i) {
    var patterns = document.documentElement.getAttribute('data-patterns') !== 'false';
    i = i % PATTERN_COUNT;
    if (patterns) return i === 0 ? 'fill:var(--ink)' : 'fill:url(#rdw-pat-' + i + ')';
    return 'fill:var(--ink);fill-opacity:' + GREYS[i];
  }
  var DASH = ['', '9 5', '2 5', '12 4 2 4', '16 6', '1 6'];
  function marker(i, x, y, r) {
    var st = 'fill:var(--card);stroke:var(--ink);stroke-width:2.2';
    switch (i % 6) {
      case 0: return s('circle', { cx: x, cy: y, r: r, style: st });
      case 1: return s('rect', { x: x - r, y: y - r, width: r * 2, height: r * 2, style: st });
      case 2: return s('path', { d: 'M' + x + ' ' + (y - r - 1) + 'L' + (x + r + 1) + ' ' + (y + r) + 'L' + (x - r - 1) + ' ' + (y + r) + 'Z', style: st });
      case 3: return s('path', { d: 'M' + x + ' ' + (y - r - 2) + 'L' + (x + r + 2) + ' ' + y + 'L' + x + ' ' + (y + r + 2) + 'L' + (x - r - 2) + ' ' + y + 'Z', style: st });
      case 4: return s('path', { d: 'M' + (x - r) + ' ' + (y - r) + 'L' + (x + r) + ' ' + (y + r) + 'M' + (x + r) + ' ' + (y - r) + 'L' + (x - r) + ' ' + (y + r), style: 'fill:none;stroke:var(--ink);stroke-width:3' });
      default: return s('path', { d: 'M' + x + ' ' + (y - r - 1) + 'V' + (y + r + 1) + 'M' + (x - r - 1) + ' ' + y + 'H' + (x + r + 1), style: 'fill:none;stroke:var(--ink);stroke-width:3' });
    }
  }
  function swatch(i, w, hgt) {
    var svg = s('svg', { width: w || 22, height: hgt || 14, 'aria-hidden': 'true', class: 'sw' });
    svg.appendChild(s('rect', { x: '1', y: '1', width: (w || 22) - 2, height: (hgt || 14) - 2, style: paint(i) + ';stroke:var(--ink);stroke-width:2' }));
    return svg;
  }

  /* ---- mount: draw now + redraw on resize ------------------------------------- */
  function mount(container, draw) {
    var last = 0;
    function render() {
      var w = Math.max(260, container.clientWidth || 300); last = w;
      RDW.clear(container); container.appendChild(draw(w, remPx()));
    }
    render();
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(RDW.debounce(function () {
        if (!container.isConnected) { ro.disconnect(); return; }
        if (Math.abs((container.clientWidth || 0) - last) > 10) render();
      }, 140));
      ro.observe(container);
    }
    return { redraw: render };
  }

  function emptyChart(msg) { return h('div', { class: 'chart-empty' }, h('p', null, msg || 'No numbers yet.'), h('p', { class: 'muted' }, 'Turn on Edit mode and add some values — the charts redraw by themselves.')); }

  function dataTable(caption, headers, rows) {
    var t = h('table', { class: 'data-table' }, h('caption', { class: 'sr-only' }, caption),
      h('thead', null, h('tr', null, headers.map(function (x) { return h('th', { scope: 'col' }, x); }))),
      h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (c, i) { return h(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : null, c); })); })));
    return h('details', { class: 'chart-table' }, h('summary', null, 'View as table'), h('div', { class: 'table-wrap' }, t));
  }

  function selectBox(label, options, value, onChange) {
    var id = RDW.uid('sel');
    var sel = h('select', { id: id, onChange: function () { onChange(sel.value); } }, options.map(function (o) { return h('option', { value: o.value, selected: o.value === value }, o.label); }));
    return h('div', { class: 'ctl' }, h('label', { for: id }, label), sel);
  }

  /* ==========================================================================
     1. TOTALS — HUD-style bars
     ========================================================================== */
  function totalsCard(metrics) {
    var state = { period: 'all', mode: 'relative' };
    var card = h('div', { class: 'chart-card' });
    var list = h('ul', { class: 'hud' });
    var tableHost = h('div');
    var years = allYears(metrics);
    var anyGoal = metrics.some(function (m) { return num(m.goal) > 0; });
    var ctls = h('div', { class: 'chart-ctls' },
      selectBox('Period', [{ value: 'all', label: 'All time' }].concat(years.map(function (y) { return { value: y, label: y }; })), 'all', function (v) { state.period = v; draw(); }));
    if (anyGoal) ctls.appendChild(selectBox('Bars show', [{ value: 'relative', label: 'Size vs the biggest' }, { value: 'goal', label: 'Progress to goal' }], 'relative', function (v) { state.mode = v; draw(); }));

    function draw() {
      RDW.clear(list); RDW.clear(tableHost);
      var vals = metrics.map(function (m) { return valueFor(m, state.period); });
      var max = Math.max.apply(null, vals.concat([1]));
      metrics.forEach(function (m, i) {
        var v = vals[i], goal = num(m.goal);
        var pct = state.mode === 'goal' && goal > 0 ? Math.min(100, v / goal * 100) : (v / max * 100);
        var unit = m.unit ? ' ' + m.unit : '';
        list.appendChild(h('li', { class: 'hud-row' },
          h('div', { class: 'hud-top' }, h('span', { class: 'hud-label' }, m.label), h('span', { class: 'hud-val' }, fmt(v), h('small', null, unit),
            state.mode === 'goal' && goal > 0 ? h('small', { class: 'muted' }, ' / ' + fmt(goal)) : null)),
          h('div', { class: 'hud-bar', role: 'meter', 'aria-label': m.label, 'aria-valuemin': '0', 'aria-valuemax': String(state.mode === 'goal' && goal > 0 ? goal : max), 'aria-valuenow': String(v) },
            h('i', { style: { width: pct + '%' } }))));
      });
      tableHost.appendChild(dataTable('Totals', ['Metric', 'Value', 'Goal'], metrics.map(function (m, i) { return [m.label, fmt(vals[i]) + (m.unit ? ' ' + m.unit : ''), num(m.goal) > 0 ? fmt(m.goal) : '—']; })));
    }
    card.appendChild(ctls); card.appendChild(list); card.appendChild(tableHost); draw();
    return card;
  }

  /* ==========================================================================
     2. TREND — multi-line chart with keyboard crosshair
     ========================================================================== */
  function trendCard(metrics) {
    var periods = allPeriods(metrics);
    var withData = metrics.filter(function (m) { return valueFor(m, 'all') > 0; });
    var chosen = (withData.length ? withData : metrics).slice(0, 3).map(function (m) { return m.id; });
    var card = h('div', { class: 'chart-card' });
    var chips = h('ul', { class: 'chips', 'aria-label': 'Choose up to six metrics to plot' });
    var plot = h('div', { class: 'plot' });
    var tip = h('div', { class: 'tip', role: 'status', 'aria-live': 'polite', hidden: true });
    var tableHost = h('div');
    var MAXSEL = 6;

    function renderChips() {
      RDW.clear(chips);
      metrics.forEach(function (m) {
        var on = chosen.indexOf(m.id) !== -1, idx = chosen.indexOf(m.id);
        var b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), disabled: !on && chosen.length >= MAXSEL,
          onClick: function () { if (on) chosen = chosen.filter(function (x) { return x !== m.id; }); else chosen.push(m.id); renderChips(); drawer.redraw(); renderTable(); } },
          on ? swatchLine(idx) : null, m.label);
        chips.appendChild(h('li', null, b));
      });
    }
    function swatchLine(i) {
      var svg = s('svg', { width: 30, height: 12, 'aria-hidden': 'true' });
      svg.appendChild(s('path', { d: 'M1 6H29', style: 'fill:none;stroke:var(--ink);stroke-width:2.4', 'stroke-dasharray': DASH[i % 6] }));
      svg.appendChild(marker(i, 15, 6, 3)); return svg;
    }
    function selected() { return chosen.map(function (id) { return metrics.filter(function (m) { return m.id === id; })[0]; }).filter(Boolean); }

    function draw(w, rem) {
      var sel = selected();
      if (!periods.length || !sel.length) return emptyChart(sel.length ? 'No values to plot yet.' : 'Pick at least one metric above.');
      var H = RDW.clamp(Math.round(w * 0.46), 230, 360);
      var ml = rem * 3, mr = rem * 1.1, mt = rem * 0.9, mb = rem * 2.3;
      var pw = w - ml - mr, ph = H - mt - mb, n = periods.length;
      var yMax = niceMax(Math.max.apply(null, sel.map(function (m) { return Math.max.apply(null, periods.map(function (p) { return valueAt(m, p); })); }).concat([1])));
      var X = function (i) { return n === 1 ? ml + pw / 2 : ml + i * pw / (n - 1); };
      var Y = function (v) { return mt + ph - v / yMax * ph; };
      var svg = s('svg', { viewBox: '0 0 ' + w + ' ' + H, width: w, height: H, class: 'chart-svg', role: 'group', tabindex: '0', 'aria-roledescription': 'line chart',
        'aria-label': 'Line chart of ' + sel.map(function (m) { return m.label; }).join(', ') + ' over ' + n + ' periods. Use the left and right arrow keys to inspect each period.' });
      // grid + y labels
      for (var t = 0; t <= 4; t++) {
        var v = yMax / 4 * t, y = Y(v);
        svg.appendChild(s('path', { d: 'M' + ml + ' ' + y + 'H' + (w - mr), style: 'stroke:var(--line-soft);stroke-width:1;fill:none', 'stroke-dasharray': t === 0 ? '' : '3 4' }));
        svg.appendChild(s('text', { x: ml - 8, y: y + 4, 'text-anchor': 'end', class: 'ch-label' }, fmt(v)));
      }
      // x labels (thin out if crowded)
      var every = Math.ceil(n / Math.max(2, Math.floor(pw / (rem * 4.2))));
      periods.forEach(function (p, i) { if (i % every === 0 || i === n - 1) svg.appendChild(s('text', { x: X(i), y: H - mb + rem * 1.3, 'text-anchor': 'middle', class: 'ch-label' }, p)); });
      // series
      sel.forEach(function (m, si) {
        var pts = periods.map(function (p, i) { return [X(i), Y(valueAt(m, p))]; });
        svg.appendChild(s('path', { d: pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(''), style: 'fill:none;stroke:var(--ink);stroke-width:2.6;stroke-linejoin:round', 'stroke-dasharray': DASH[si % 6] }));
        pts.forEach(function (p) { svg.appendChild(marker(si, p[0], p[1], 4)); });
      });
      // crosshair
      var cross = s('path', { d: 'M0 ' + mt + 'V' + (mt + ph), style: 'stroke:var(--ink);stroke-width:1.5;fill:none', visibility: 'hidden' });
      svg.appendChild(cross);
      var cur = -1;
      function show(i) {
        cur = RDW.clamp(i, 0, n - 1);
        cross.setAttribute('d', 'M' + X(cur) + ' ' + mt + 'V' + (mt + ph)); cross.setAttribute('visibility', 'visible');
        RDW.clear(tip); tip.hidden = false;
        tip.appendChild(h('strong', null, periods[cur]));
        sel.forEach(function (m, si) { tip.appendChild(h('span', { class: 'tip-row' }, swatchLine(si), m.label + ': ', h('b', null, fmt(valueAt(m, periods[cur])) + (m.unit ? ' ' + m.unit : '')))); });
        var left = RDW.clamp(X(cur) - 60, 0, w - 170);
        tip.style.left = left + 'px'; tip.style.top = (mt + 4) + 'px';
      }
      function hide() { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; cur = -1; }
      svg.addEventListener('pointermove', function (ev) {
        var r = svg.getBoundingClientRect(); var x = (ev.clientX - r.left) * (w / r.width);
        show(Math.round((x - ml) / (n === 1 ? 1 : pw / (n - 1))));
      });
      svg.addEventListener('pointerleave', function () { if (document.activeElement !== svg) hide(); });
      svg.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight') { show(cur < 0 ? 0 : cur + 1); ev.preventDefault(); }
        else if (ev.key === 'ArrowLeft') { show(cur < 0 ? n - 1 : cur - 1); ev.preventDefault(); }
        else if (ev.key === 'Home') { show(0); ev.preventDefault(); }
        else if (ev.key === 'End') { show(n - 1); ev.preventDefault(); }
        else if (ev.key === 'Escape' && cur >= 0) { hide(); ev.stopPropagation(); }
      });
      svg.addEventListener('blur', hide);
      return svg;
    }
    function renderTable() {
      RDW.clear(tableHost); var sel = selected(); if (!sel.length || !periods.length) return;
      tableHost.appendChild(dataTable('Trend values by period', ['Period'].concat(sel.map(function (m) { return m.label; })),
        periods.map(function (p) { return [p].concat(sel.map(function (m) { return fmt(valueAt(m, p)); })); })));
    }
    card.appendChild(chips); card.appendChild(h('div', { class: 'plot-wrap' }, plot, tip)); card.appendChild(tableHost);
    renderChips(); var drawer = mount(plot, draw); renderTable();
    return card;
  }

  /* ==========================================================================
     3. MIX — donut by group
     ========================================================================== */
  function polar(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arc(cx, cy, r0, r1, a0, a1) {
    var large = a1 - a0 > Math.PI ? 1 : 0;
    var p0 = polar(cx, cy, r1, a0), p1 = polar(cx, cy, r1, a1), p2 = polar(cx, cy, r0, a1), p3 = polar(cx, cy, r0, a0);
    return 'M' + p0 + 'A' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + p1 + 'L' + p2 + 'A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + p3 + 'Z';
  }
  function mixCard(metrics) {
    var state = { period: 'all' };
    var card = h('div', { class: 'chart-card' });
    var body = h('div', { class: 'mix' }); var tableHost = h('div');
    var years = allYears(metrics);
    card.appendChild(h('div', { class: 'chart-ctls' }, selectBox('Period', [{ value: 'all', label: 'All time' }].concat(years.map(function (y) { return { value: y, label: y }; })), 'all', function (v) { state.period = v; draw(); })));
    card.appendChild(body); card.appendChild(tableHost);

    function draw() {
      RDW.clear(body); RDW.clear(tableHost);
      var groups = {}, order = [];
      metrics.forEach(function (m) { var g = (m.group || 'Other').trim() || 'Other'; if (!(g in groups)) { groups[g] = 0; order.push(g); } groups[g] += valueFor(m, state.period); });
      var total = order.reduce(function (a, g) { return a + groups[g]; }, 0);
      if (total <= 0) { body.appendChild(emptyChart('Nothing to split up for this period.')); return; }
      var size = 220, cx = size / 2, cy = size / 2, r1 = 100, r0 = 62;
      var svg = s('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, class: 'chart-svg donut', role: 'group', 'aria-label': 'Donut chart of totals by group' });
      var centerV = s('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'donut-val' }, fmt(total));
      var centerL = s('text', { x: cx, y: cy + 26, 'text-anchor': 'middle', class: 'ch-label' }, 'total');
      var legend = h('ul', { class: 'legend' });
      var a = -Math.PI / 2, slices = [];
      var active = function (i) {
        slices.forEach(function (sl, k) { sl.path.classList.toggle('is-active', k === i); sl.li.classList.toggle('is-active', k === i); });
        if (i === null) { centerV.textContent = fmt(total); centerL.textContent = 'total'; }
        else { centerV.textContent = fmt(groups[order[i]]); centerL.textContent = order[i] + ' · ' + Math.round(groups[order[i]] / total * 100) + '%'; }
      };
      order.forEach(function (g, i) {
        if (groups[g] <= 0) return;
        var frac = groups[g] / total, a1 = a + frac * Math.PI * 2 - (frac >= 0.9999 ? 0.0001 : 0);
        var path = s('path', { d: arc(cx, cy, r0, r1, a, a1), style: paint(i) + ';stroke:var(--ink);stroke-width:2.2', tabindex: '0', role: 'img',
          'aria-label': g + ': ' + fmt(groups[g]) + ', ' + Math.round(frac * 100) + ' percent' });
        var li = h('li', { class: 'legend-item', tabindex: '-1' }, swatch(i), h('span', { class: 'legend-name' }, g), h('span', { class: 'legend-val' }, fmt(groups[g]) + ' · ' + Math.round(frac * 100) + '%'));
        ['pointerenter', 'focus'].forEach(function (ev) { path.addEventListener(ev, function () { active(i); }); li.addEventListener(ev, function () { active(i); }); });
        ['pointerleave', 'blur'].forEach(function (ev) { path.addEventListener(ev, function () { active(null); }); li.addEventListener(ev, function () { active(null); }); });
        svg.appendChild(path); legend.appendChild(li); slices.push({ path: path, li: li, i: i });
        a = a1;
      });
      // slices array is indexed by order index for active(); rebuild mapping
      var map = {}; slices.forEach(function (sl) { map[sl.i] = sl; });
      slices = order.map(function (g, i) { return map[i] || { path: document.createElement('i'), li: document.createElement('i') }; });
      svg.appendChild(centerV); svg.appendChild(centerL);
      body.appendChild(svg); body.appendChild(legend);
      tableHost.appendChild(dataTable('Totals by group', ['Group', 'Total', 'Share'], order.filter(function (g) { return groups[g] > 0; }).map(function (g) { return [g, fmt(groups[g]), Math.round(groups[g] / total * 100) + '%']; })));
    }
    draw(); return card;
  }

  /* ==========================================================================
     4. RHYTHM — bars per period
     ========================================================================== */
  function rhythmCard(metrics) {
    var periods = allPeriods(metrics);
    var state = { metric: 'all' };
    var card = h('div', { class: 'chart-card' });
    var plot = h('div', { class: 'plot' }); var tip = h('div', { class: 'tip', role: 'status', 'aria-live': 'polite', hidden: true }); var tableHost = h('div');
    card.appendChild(h('div', { class: 'chart-ctls' }, selectBox('Metric', [{ value: 'all', label: 'Everything added up' }].concat(metrics.map(function (m) { return { value: m.id, label: m.label }; })), 'all', function (v) { state.metric = v; drawer.redraw(); renderTable(); })));
    card.appendChild(h('div', { class: 'plot-wrap' }, plot, tip)); card.appendChild(tableHost);
    function series() {
      return periods.map(function (p) {
        var v = metrics.reduce(function (a, m) { return a + ((state.metric === 'all' || m.id === state.metric) ? valueAt(m, p) : 0); }, 0);
        return { p: p, v: v };
      });
    }
    function draw(w, rem) {
      var data = series();
      if (!periods.length || !data.some(function (d) { return d.v > 0; })) return emptyChart('No activity logged for this one yet.');
      var H = RDW.clamp(Math.round(w * 0.42), 220, 320);
      var ml = rem * 3, mr = rem * 0.8, mt = rem * 1.4, mb = rem * 2.3, pw = w - ml - mr, ph = H - mt - mb, n = data.length;
      var yMax = niceMax(Math.max.apply(null, data.map(function (d) { return d.v; })));
      var svg = s('svg', { viewBox: '0 0 ' + w + ' ' + H, width: w, height: H, class: 'chart-svg', role: 'group', 'aria-roledescription': 'bar chart', 'aria-label': 'Bar chart of activity per period' });
      for (var t = 0; t <= 4; t++) {
        var y = mt + ph - ph * t / 4;
        svg.appendChild(s('path', { d: 'M' + ml + ' ' + y + 'H' + (w - mr), style: 'stroke:var(--line-soft);stroke-width:1;fill:none', 'stroke-dasharray': t === 0 ? '' : '3 4' }));
        svg.appendChild(s('text', { x: ml - 8, y: y + 4, 'text-anchor': 'end', class: 'ch-label' }, fmt(yMax / 4 * t)));
      }
      var slot = pw / n, bw = Math.min(rem * 3.2, slot * 0.66);
      var every = Math.ceil(n / Math.max(2, Math.floor(pw / (rem * 4.2))));
      data.forEach(function (d, i) {
        var bh = d.v / yMax * ph, x = ml + slot * i + (slot - bw) / 2, y = mt + ph - bh;
        var r = s('rect', { x: x, y: y, width: bw, height: Math.max(bh, 0), class: 'bar', tabindex: '0', role: 'img', style: paint(1) + ';stroke:var(--ink);stroke-width:2.2', 'aria-label': d.p + ': ' + fmt(d.v) });
        var showTip = function () { RDW.clear(tip); tip.hidden = false; tip.appendChild(h('strong', null, d.p)); tip.appendChild(h('span', { class: 'tip-row' }, h('b', null, fmt(d.v)))); tip.style.left = RDW.clamp(x + bw / 2 - 40, 0, w - 110) + 'px'; tip.style.top = Math.max(0, y - 52) + 'px'; };
        r.addEventListener('pointerenter', showTip); r.addEventListener('focus', showTip);
        r.addEventListener('pointerleave', function () { tip.hidden = true; }); r.addEventListener('blur', function () { tip.hidden = true; });
        svg.appendChild(r);
        if (d.v > 0) svg.appendChild(s('text', { x: x + bw / 2, y: y - 6, 'text-anchor': 'middle', class: 'ch-label ch-label--bold' }, fmt(d.v)));
        if (i % every === 0 || i === n - 1) svg.appendChild(s('text', { x: x + bw / 2, y: H - mb + rem * 1.3, 'text-anchor': 'middle', class: 'ch-label' }, d.p));
      });
      return svg;
    }
    function renderTable() { RDW.clear(tableHost); if (periods.length) tableHost.appendChild(dataTable('Activity by period', ['Period', 'Value'], series().map(function (d) { return [d.p, fmt(d.v)]; }))); }
    var drawer = mount(plot, draw); renderTable();
    return card;
  }

  /* ==========================================================================
     5. GOALS — progress rings
     ========================================================================== */
  function goalsCard(metrics) {
    var withGoals = metrics.filter(function (m) { return num(m.goal) > 0; });
    var card = h('div', { class: 'chart-card' });
    if (!withGoals.length) { card.appendChild(h('div', { class: 'chart-empty' }, h('p', null, 'No goals set.'), h('p', { class: 'muted' }, 'Edit a metric and give it a goal number to see a progress ring here.'))); return card; }
    var thisYear = String(new Date().getFullYear());
    var grid = h('ul', { class: 'rings' });
    withGoals.forEach(function (m) {
      var scope = m.goalScope === 'year' ? thisYear : 'all';
      var v = valueFor(m, scope), g = num(m.goal), pct = Math.min(1, v / g);
      var R = 38, C = 2 * Math.PI * R;
      var svg = s('svg', { viewBox: '0 0 100 100', width: 104, height: 104, 'aria-hidden': 'true', class: 'ring' },
        s('circle', { cx: 50, cy: 50, r: R, style: 'fill:none;stroke:var(--line-soft);stroke-width:10' }),
        s('circle', { cx: 50, cy: 50, r: R, style: 'fill:none;stroke:var(--ink);stroke-width:10', 'stroke-dasharray': (C * pct).toFixed(1) + ' ' + C.toFixed(1), transform: 'rotate(-90 50 50)', 'stroke-linecap': 'butt' }),
        s('text', { x: 50, y: 56, 'text-anchor': 'middle', class: 'ring-pct' }, Math.round(pct * 100) + '%'));
      grid.appendChild(h('li', { class: 'ring-item' }, svg,
        h('span', { class: 'ring-label' }, m.label), h('span', { class: 'ring-sub muted' }, fmt(v) + ' / ' + fmt(g) + (m.goalScope === 'year' ? ' in ' + thisYear : ' total'))));
    });
    card.appendChild(grid);
    card.appendChild(dataTable('Goal progress', ['Metric', 'Done', 'Goal'], withGoals.map(function (m) { return [m.label, fmt(valueFor(m, m.goalScope === 'year' ? thisYear : 'all')), fmt(m.goal)]; })));
    return card;
  }

  RDW.charts = {
    patternDefs: patternDefs, totals: totalsCard, trend: trendCard, mix: mixCard, rhythm: rhythmCard, goals: goalsCard,
    hasData: hasData, valueFor: valueFor, allYears: allYears, allPeriods: allPeriods, mount: mount
  };
})();
