/* ==========================================================================
   blocks.js — the reusable building blocks every section is made of.

   paragraph · fields · list · tags · cards · gallery · audio · timeline ·
   journal · faq · stats · palette · quiz   (+ letter, see letter.js)

   Each type has: a label, a form schema (what the editor shows), an empty
   shape, and a render function. To invent a NEW type, call
   RDW.blocks.register('mytype', {...}) — then it works everywhere.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW; var h = RDW.h;
  var types = {};

  var SILLY_EMPTY = [
    'Nothing here yet. DWEEB is probably procrastinating.',
    'This space is intentionally blank. (Not intentionally. It is a lie.)',
    'Still empty. Coming soon™, said every website ever.',
    'Under construction. A hamster is typing this section as fast as it can.',
    'Empty. Like a fridge at 2am, but with fewer snacks.',
    'Blank for now. The author has been notified (by himself).'
  ];
  function sillyFor(id) { var n = parseInt(RDW.hash(String(id)), 10) || 0; return SILLY_EMPTY[n % SILLY_EMPTY.length]; }

  function register(type, def) { types[type] = def; }

  function nonEmpty(arr) { return RDW.asArray(arr).filter(function (x) { return String(x).trim() !== ''; }); }
  function hasText(v) { return String(v === undefined || v === null ? '' : v).trim() !== ''; }

  function paraBlock(arr) { return h('div', { class: 'prose' }, RDW.paragraphs(arr)); }

  /* ---- paragraph ------------------------------------------------------------ */
  register('paragraph', {
    label: 'Paragraphs', description: 'One or many paragraphs, with an optional "read more" part.',
    empty: function () { return { text: [], more: [] }; },
    schema: function () { return [
      { key: 'text', kind: 'paragraphs', label: 'Paragraphs' },
      { key: 'more', kind: 'paragraphs', label: 'Full version (optional)', help: 'Hidden behind a "Read the full version" button. Great for short bio → long bio.' }
    ]; },
    isEmpty: function (b) { return !nonEmpty(b.text).length && !nonEmpty(b.more).length; },
    render: function (b) {
      var wrap = h('div', { class: 'prose-wrap' }, paraBlock(b.text));
      if (nonEmpty(b.more).length) {
        var id = RDW.uid('more');
        var body = h('div', { class: 'more-body prose', id: id, hidden: true }, RDW.paragraphs(b.more));
        var btn = h('button', { type: 'button', class: 'btn btn--small more-toggle', 'aria-expanded': 'false', 'aria-controls': id,
          onClick: function () { var open = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', String(!open)); body.hidden = open; } },
          h('span', { class: 't-closed' }, 'Read the full version'), h('span', { class: 't-open' }, 'Show less'));
        wrap.appendChild(btn); wrap.appendChild(body);
      }
      return wrap;
    }
  });

  /* ---- fields (label + value pairs) ----------------------------------------- */
  register('fields', {
    label: 'Labelled fields', description: 'Label + value pairs, like an ID card.', showInEditWhenEmpty: true,
    empty: function () { return { items: [] }; },
    schema: function () { return [{ key: 'items', kind: 'list', label: 'Fields', itemLabel: 'Field', summary: function (i) { return i.label; },
      newItem: function () { return { label: '', value: '' }; },
      itemSchema: [{ key: 'label', label: 'Label' }, { key: 'value', kind: 'textarea', rows: 2, label: 'Value', help: 'Leave empty to hide it from visitors. <Secret&5> makes a censor bar.' }] }]; },
    isEmpty: function (b, ctx) { return ctx.editing ? !(b.items || []).length : !(b.items || []).some(function (i) { return hasText(i.value); }); },
    render: function (b, ctx) {
      var dl = h('dl', { class: 'kv' });
      (b.items || []).forEach(function (i) {
        var filled = hasText(i.value);
        if (!filled && !ctx.editing) return;
        dl.appendChild(h('div', { class: 'kv-row' + (filled ? '' : ' is-blank') },
          h('dt', null, i.label || '(unnamed)'),
          h('dd', { style: { whiteSpace: 'pre-wrap' } }, filled ? RDW.rich(i.value) : '—')));
      });
      return dl;
    }
  });

  /* ---- list ---------------------------------------------------------------------- */
  register('list', {
    label: 'List', description: 'A simple bulleted (or numbered) list.',
    empty: function () { return { items: [], ordered: false }; },
    schema: function () { return [
      { key: 'items', kind: 'lines', label: 'Items', rows: 8 },
      { key: 'ordered', kind: 'checkbox', label: 'Number the items' }
    ]; },
    isEmpty: function (b) { return !nonEmpty(b.items).length; },
    render: function (b) {
      var ul = h(b.ordered ? 'ol' : 'ul', { class: 'bullets' });
      nonEmpty(b.items).forEach(function (t) { ul.appendChild(h('li', null, RDW.rich(t))); });
      return ul;
    }
  });

  /* ---- tags ---------------------------------------------------------------------- */
  register('tags', {
    label: 'Tags', description: 'Short labels shown as chips.',
    empty: function () { return { items: [] }; },
    schema: function () { return [{ key: 'items', kind: 'tags', label: 'Tags' }]; },
    isEmpty: function (b) { return !nonEmpty(b.items).length; },
    render: function (b) {
      var ul = h('ul', { class: 'tags' });
      nonEmpty(b.items).forEach(function (t) { ul.appendChild(h('li', { class: 'tag' }, RDW.rich(t))); });
      return ul;
    }
  });

  /* ---- cards --------------------------------------------------------------------- */
  register('cards', {
    label: 'Cards', description: 'A grid of cards: title, subtitle, date, text, tags, optional picture and link.',
    empty: function () { return { items: [] }; },
    schema: function (b, ctx) { return [{ key: 'items', kind: 'list', label: 'Cards', itemLabel: 'Card', summary: function (i) { return i.title; },
      newItem: function () { return { title: '', subtitle: '', date: '', text: [], tags: [], image: '', link: '' }; },
      itemSchema: [
        { key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle' }, { key: 'date', label: 'Date or period', placeholder: '2024-05 or "Summer 2019"' },
        { key: 'text', kind: 'paragraphs', label: 'Text' }, { key: 'tags', kind: 'tags', label: 'Tags' },
        { key: 'image', kind: 'image', label: 'Picture (optional)', folder: ctx.imgFolder },
        { key: 'link', label: 'Link (optional)', placeholder: 'https://…' }
      ] }]; },
    isEmpty: function (b) { return !(b.items || []).length; },
    render: function (b, ctx) {
      var grid = h('div', { class: 'cards' });
      (b.items || []).forEach(function (c) {
        var card = h('article', { class: 'card' });
        if (hasText(c.image)) {
          var src = RDW.resolveAsset(c.image, ctx.imgFolder);
          card.appendChild(h('button', { type: 'button', class: 'card-img', 'aria-label': 'View picture: ' + (c.title || c.image),
            onClick: function () { RDW.lightbox.open([{ src: src, caption: c.title, description: c.subtitle }], 0); } },
            h('img', { src: src, alt: '', loading: 'lazy', onError: function (ev) { var p = ev.target.parentNode; if (p) p.remove(); } })));
        }
        var body = h('div', { class: 'card-body' });
        if (hasText(c.date)) body.appendChild(h('p', { class: 'card-meta' }, RDW.fmt.nice(c.date)));
        body.appendChild(h('h3', { class: 'card-title' }, RDW.rich(c.title || '(untitled)')));
        if (hasText(c.subtitle)) body.appendChild(h('p', { class: 'card-sub' }, RDW.rich(c.subtitle)));
        RDW.paragraphs(c.text).forEach(function (p) { body.appendChild(p); });
        if (nonEmpty(c.tags).length) body.appendChild(h('ul', { class: 'tags tags--small' }, nonEmpty(c.tags).map(function (t) { return h('li', { class: 'tag' }, t); })));
        if (hasText(c.link) && /^https?:\/\//i.test(c.link)) body.appendChild(h('p', { class: 'card-link' }, h('a', { href: c.link, target: '_blank', rel: 'noopener noreferrer' }, 'Open link ↗')));
        card.appendChild(body); grid.appendChild(card);
      });
      return grid;
    }
  });

  /* ---- gallery ------------------------------------------------------------------- */
  register('gallery', {
    label: 'Image gallery', description: 'Screenshots and artwork with captions and a full-size viewer.',
    empty: function () { return { items: [] }; },
    schema: function (b, ctx) { return [{ key: 'items', kind: 'list', label: 'Images', itemLabel: 'Image', summary: function (i) { return i.caption || i.src; },
      bulkKey: 'src', bulkPlaceholder: 'cat-drawing.png\nscreenshot-01.png\n(one file name per line)',
      newItem: function () { return { src: '', caption: '', date: '', description: '' }; },
      help: 'Put the pictures in ' + ctx.imgFolder + ' then list the file names here.',
      itemSchema: [
        { key: 'src', kind: 'image', label: 'Image file', folder: ctx.imgFolder }, { key: 'caption', label: 'Caption' },
        { key: 'date', label: 'Date', placeholder: '2024-05-17' }, { key: 'description', kind: 'textarea', rows: 3, label: 'Description' }
      ] }]; },
    isEmpty: function (b) { return !(b.items || []).length; },
    render: function (b, ctx) {
      var items = (b.items || []).filter(function (i) { return hasText(i.src); }).map(function (i) { return Object.assign({}, i, { src: RDW.resolveAsset(i.src, ctx.imgFolder), file: i.src }); });
      var grid = h('div', { class: 'gallery' + (items.length === 1 ? ' gallery--single' : '') });
      items.forEach(function (it, idx) {
        var thumb = h('button', { type: 'button', class: 'shot', 'aria-label': 'Open full size: ' + (it.caption || it.file), onClick: function (ev) { RDW.lightbox.open(items, idx, ev.currentTarget); } });
        var img = h('img', { src: it.src, alt: it.caption || '', loading: 'lazy' });
        img.addEventListener('error', function () {
          thumb.classList.add('is-missing'); img.remove();
          thumb.appendChild(h('span', { class: 'shot-missing' }, h('strong', null, 'Image not found'), h('span', null, it.file)));
        });
        thumb.appendChild(img);
        var fig = h('figure', { class: 'shot-fig' }, thumb);
        if (it.caption || it.date) fig.appendChild(h('figcaption', { class: 'shot-cap' },
          it.caption ? h('strong', null, RDW.rich(it.caption)) : null, it.date ? h('span', { class: 'muted' }, RDW.fmt.nice(it.date)) : null));
        grid.appendChild(fig);
      });
      return grid;
    }
  });

  /* ---- audio --------------------------------------------------------------------- */
  register('audio', {
    label: 'Audio clips', description: 'Little audio players (beats, tags, previews).',
    empty: function () { return { items: [] }; },
    schema: function () { return [{ key: 'items', kind: 'list', label: 'Clips', itemLabel: 'Clip', summary: function (i) { return i.title || i.src; },
      newItem: function () { return { src: '', title: '', description: '' }; },
      help: 'Put the files in the music/ folder and type the file name (e.g. my-beat.mp3).',
      itemSchema: [{ key: 'src', label: 'Audio file', placeholder: 'my-beat.mp3' }, { key: 'title', label: 'Title' }, { key: 'description', kind: 'textarea', rows: 3, label: 'Description' }] }]; },
    isEmpty: function (b) { return !(b.items || []).length; },
    render: function (b) {
      var list = h('ul', { class: 'clips' });
      (b.items || []).forEach(function (c) {
        var li = h('li', { class: 'clip' }, h('h3', { class: 'clip-title' }, RDW.rich(c.title || c.src || '(untitled)')));
        if (hasText(c.description)) li.appendChild(h('p', { class: 'muted' }, RDW.rich(c.description)));
        if (hasText(c.src)) {
          var src = RDW.resolveAsset(c.src, 'music/');
          var a = h('audio', { controls: true, preload: 'none', src: src, 'aria-label': c.title || c.src });
          a.addEventListener('play', function () { if (RDW.player) RDW.player.pause(true); });
          a.addEventListener('error', function () { a.replaceWith(h('p', { class: 'clip-missing' }, 'Audio file not found: ' + src)); });
          li.appendChild(a);
        }
        list.appendChild(li);
      });
      return list;
    }
  });

  /* ---- timeline ------------------------------------------------------------------ */
  register('timeline', {
    label: 'Timeline', description: 'Dated entries in a vertical timeline.',
    empty: function () { return { items: [], order: 'oldest' }; },
    schema: function () { return [
      { key: 'order', kind: 'select', label: 'Order', options: [{ value: 'oldest', label: 'Oldest first (by date)' }, { value: 'newest', label: 'Newest first (by date)' }, { value: 'manual', label: 'Exactly as I list them' }] },
      { key: 'items', kind: 'list', label: 'Entries', itemLabel: 'Entry', summary: function (i) { return (i.date ? i.date + ' — ' : '') + (i.title || ''); },
        newItem: function () { return { date: '', title: '', text: [] }; },
        itemSchema: [{ key: 'date', label: 'Date', placeholder: '2021, 2021-06 or 2021-06-14' }, { key: 'title', label: 'Title' }, { key: 'text', kind: 'paragraphs', label: 'Text' }] }
    ]; },
    isEmpty: function (b) { return !(b.items || []).length; },
    render: function (b) {
      var items = (b.items || []).slice();
      if (b.order === 'oldest') items.sort(function (a, c) { return String(a.date).localeCompare(String(c.date)); });
      if (b.order === 'newest') items.sort(function (a, c) { return String(c.date).localeCompare(String(a.date)); });
      var ol = h('ol', { class: 'timeline' });
      items.forEach(function (i) {
        ol.appendChild(h('li', { class: 'tl-item' },
          h('span', { class: 'tl-date' }, hasText(i.date) ? RDW.fmt.nice(i.date) : '—'),
          h('div', { class: 'tl-body' }, h('h3', { class: 'tl-title' }, RDW.rich(i.title || '(untitled)')), RDW.paragraphs(i.text))));
      });
      return ol;
    }
  });

  /* ---- journal (monthly entries) ------------------------------------------------- */
  register('journal', {
    label: 'Monthly journal', description: 'One entry per month, newest first. Made for self-reflections.',
    empty: function () { return { items: [] }; },
    schema: function () { return [{ key: 'items', kind: 'list', label: 'Entries', itemLabel: 'Entry', summary: function (i) { return RDW.fmt.nice(i.month) + (i.title ? ' — ' + i.title : ''); },
      newItem: function () { return { month: RDW.fmt.monthNow(), title: '', mood: '', text: [] }; },
      itemSchema: [{ key: 'month', kind: 'month', label: 'Month' }, { key: 'title', label: 'Title (optional)' }, { key: 'mood', label: 'Mood / one word (optional)' }, { key: 'text', kind: 'paragraphs', label: 'Reflection' }] }]; },
    isEmpty: function (b) { return !(b.items || []).length; },
    render: function (b) {
      var items = (b.items || []).slice().sort(function (a, c) { return String(c.month).localeCompare(String(a.month)); });
      var host = h('div', { class: 'journal' });
      items.forEach(function (i) {
        host.appendChild(h('article', { class: 'entry' },
          h('header', { class: 'entry-head' }, h('h3', { class: 'entry-month' }, RDW.fmt.nice(i.month) || 'Undated'),
            hasText(i.mood) ? h('span', { class: 'tag' }, i.mood) : null),
          hasText(i.title) ? h('p', { class: 'entry-title' }, RDW.rich(i.title)) : null,
          RDW.paragraphs(i.text)));
      });
      return host;
    }
  });

  /* ---- faq ----------------------------------------------------------------------- */
  register('faq', {
    label: 'Questions & answers', description: 'Expandable FAQ.',
    empty: function () { return { items: [] }; },
    schema: function () { return [{ key: 'items', kind: 'list', label: 'Questions', itemLabel: 'Question', summary: function (i) { return i.q; },
      newItem: function () { return { q: '', a: [] }; },
      itemSchema: [{ key: 'q', label: 'Question' }, { key: 'a', kind: 'paragraphs', label: 'Answer' }] }]; },
    isEmpty: function (b) { return !(b.items || []).length; },
    render: function (b) {
      var host = h('div', { class: 'faq' });
      (b.items || []).forEach(function (i) {
        host.appendChild(h('details', { class: 'faq-item' }, h('summary', null, RDW.rich(i.q || '(question)')), h('div', { class: 'faq-a prose' }, RDW.paragraphs(i.a))));
      });
      return host;
    }
  });

  /* ---- stats --------------------------------------------------------------------- */
  register('stats', {
    label: 'Number tiles', description: 'Big numbers with labels.',
    empty: function () { return { items: [] }; },
    schema: function () { return [{ key: 'items', kind: 'list', label: 'Tiles', itemLabel: 'Tile', summary: function (i) { return i.label; },
      newItem: function () { return { label: '', value: '', note: '' }; },
      itemSchema: [{ key: 'label', label: 'Label' }, { key: 'value', label: 'Value' }, { key: 'note', label: 'Small note (optional)' }] }]; },
    isEmpty: function (b) { return !(b.items || []).length; },
    render: function (b) {
      var g = h('div', { class: 'stats-grid' });
      (b.items || []).forEach(function (i) {
        g.appendChild(h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, RDW.rich(hasText(i.value) ? i.value : '—')), h('span', { class: 'stat-label' }, RDW.rich(i.label || '')),
          hasText(i.note) ? h('span', { class: 'stat-note muted' }, RDW.rich(i.note)) : null));
      });
      return g;
    }
  });

  /* ---- palette ------------------------------------------------------------------- */
  function lum(hex) { var n = parseInt(String(hex).replace('#', ''), 16) || 0; var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  register('palette', {
    label: 'Colour palette', description: 'Colour swatches with names (your own colours; the site itself stays black & white).',
    empty: function () { return { items: [] }; },
    schema: function () { return [{ key: 'items', kind: 'list', label: 'Colours', itemLabel: 'Colour', summary: function (i) { return (i.name || '') + ' ' + (i.hex || ''); },
      newItem: function () { return { name: '', hex: '#000000', note: '' }; },
      itemSchema: [{ key: 'name', label: 'Name' }, { key: 'hex', kind: 'color', label: 'Colour' }, { key: 'note', label: 'Note (optional)' }] }]; },
    isEmpty: function (b) { return !(b.items || []).length; },
    render: function (b) {
      var g = h('div', { class: 'palette' });
      (b.items || []).forEach(function (i) {
        var hex = /^#[0-9a-f]{6}$/i.test(i.hex) ? i.hex.toUpperCase() : '#000000';
        g.appendChild(h('button', { type: 'button', class: 'swatch', style: { background: hex, color: lum(hex) > 0.55 ? '#000' : '#fff' }, 'aria-label': (i.name || 'Colour') + ' ' + hex + '. Click to copy.',
          onClick: function () { (navigator.clipboard ? navigator.clipboard.writeText(hex) : Promise.reject()).then(function () { RDW.toast('Copied ' + hex); }, function () { RDW.toast(hex); }); } },
          h('span', { class: 'swatch-name' }, i.name || 'Unnamed'), h('span', { class: 'swatch-hex' }, hex), hasText(i.note) ? h('span', { class: 'swatch-note' }, i.note) : null));
      });
      return g;
    }
  });

  /* ---- quiz ---------------------------------------------------------------------- */
  register('quiz', {
    label: '"How well do you know me?" quiz', description: 'Multiple-choice quiz with scoring and result tiers.',
    empty: function () { return { intro: '', questions: [], results: [] }; },
    schema: function () { return [
      { key: 'intro', kind: 'textarea', rows: 2, label: 'Intro text (optional)' },
      { key: 'questions', kind: 'list', label: 'Questions', itemLabel: 'Question', summary: function (i) { return i.q; },
        newItem: function () { return { q: '', options: ['', '', '', ''], answer: 1, explain: '' }; },
        itemSchema: [{ key: 'q', label: 'Question' }, { key: 'options', kind: 'lines', rows: 5, label: 'Answer options', help: 'One option per line.' },
          { key: 'answer', kind: 'number', label: 'Which option is correct? (1 = first line)', min: 1, step: 1 }, { key: 'explain', kind: 'textarea', rows: 2, label: 'Explanation shown after answering (optional)' }] },
      { key: 'results', kind: 'list', label: 'Result tiers', itemLabel: 'Tier', summary: function (i) { return (i.min !== '' && i.min !== undefined ? i.min + '%+ ' : '') + (i.title || ''); },
        newItem: function () { return { min: 0, title: '', text: [] }; },
        help: 'The player gets the highest tier whose "minimum %" they reach. Include one tier at 0%.',
        itemSchema: [{ key: 'min', kind: 'number', label: 'Minimum score (%)', min: 0, max: 100, step: 1 }, { key: 'title', label: 'Title' }, { key: 'text', kind: 'paragraphs', label: 'Text' }] }
    ]; },
    isEmpty: function (b) { return !(b.questions || []).length; },
    render: function (b) {
      var qs = (b.questions || []).filter(function (q) { return hasText(q.q) && nonEmpty(q.options).length >= 2; });
      var host = h('div', { class: 'quiz' });
      var state = { i: 0, picks: [] };

      function start() {
        RDW.clear(host); state = { i: 0, picks: [] };
        host.appendChild(h('div', { class: 'quiz-start' },
          hasText(b.intro) ? h('p', null, RDW.rich(b.intro)) : null,
          h('p', { class: 'muted' }, qs.length + ' question' + (qs.length === 1 ? '' : 's') + '. No pressure. (A little pressure.)'),
          h('button', { type: 'button', class: 'btn btn--primary', onClick: function () { ask(); } }, 'Start the quiz')));
      }
      function ask() {
        RDW.clear(host);
        var q = qs[state.i], name = RDW.uid('q'), answered = false;
        var opts = nonEmpty(q.options);
        var fb = h('div', { class: 'quiz-fb', 'aria-live': 'polite' });
        var next = h('button', { type: 'button', class: 'btn btn--primary', hidden: true, onClick: function () { state.i++; if (state.i < qs.length) ask(); else finish(); } }, state.i + 1 < qs.length ? 'Next question' : 'See my score');
        var legend = h('legend', { class: 'quiz-q', tabindex: '-1' }, RDW.rich(q.q));
        var fs = h('fieldset', { class: 'quiz-fs' }, legend);
        opts.forEach(function (o, idx) {
          var id = name + '-' + idx;
          var input = h('input', { type: 'radio', name: name, id: id, value: String(idx + 1) });
          input.addEventListener('change', function () {
            if (answered) return; answered = true;
            state.picks[state.i] = idx + 1;
            var ok = (idx + 1) === Number(q.answer);
            RDW.$$('input', fs).forEach(function (r) { r.disabled = true; });
            RDW.$$('.quiz-opt', fs).forEach(function (lab, k) { if ((k + 1) === Number(q.answer)) lab.classList.add('is-right'); else if (k === idx) lab.classList.add('is-wrong'); });
            fb.appendChild(h('p', { class: 'quiz-verdict' }, ok ? '✔ Correct.' : '✘ Nope. The answer was: ' + (opts[Number(q.answer) - 1] ? RDW.plain(opts[Number(q.answer) - 1]) : '?')));
            if (hasText(q.explain)) fb.appendChild(h('p', { class: 'muted' }, RDW.rich(q.explain)));
            next.hidden = false; next.focus();
          });
          fs.appendChild(h('label', { class: 'quiz-opt', for: id }, input, h('span', null, RDW.rich(o))));
        });
        host.appendChild(h('p', { class: 'quiz-progress muted' }, 'Question ' + (state.i + 1) + ' of ' + qs.length));
        host.appendChild(fs); host.appendChild(fb); host.appendChild(next);
        legend.focus({ preventScroll: true });
      }
      function finish() {
        RDW.clear(host);
        var score = 0; qs.forEach(function (q, i) { if (state.picks[i] === Number(q.answer)) score++; });
        var pct = Math.round(score / qs.length * 100);
        var tiers = (b.results || []).slice().sort(function (a, c) { return Number(c.min) - Number(a.min); });
        var tier = tiers.filter(function (t) { return pct >= Number(t.min || 0); })[0];
        var res = h('div', { class: 'quiz-result', tabindex: '-1' },
          h('p', { class: 'quiz-score' }, score + ' / ' + qs.length), h('p', { class: 'muted' }, pct + '% correct'),
          tier ? h('h3', null, RDW.rich(tier.title || '')) : null, tier ? RDW.paragraphs(tier.text) : null,
          h('button', { type: 'button', class: 'btn', onClick: start }, 'Try again'));
        host.appendChild(res); res.focus({ preventScroll: true });
        RDW.announce('Quiz finished. You scored ' + score + ' out of ' + qs.length);
      }
      if (!qs.length) host.appendChild(h('p', { class: 'muted' }, 'The quiz needs at least one question with two options.'));
      else start();
      return host;
    }
  });

  /* ---- shared plumbing ----------------------------------------------------------- */
  function emptyState(b, ctx) {
    var box = h('div', { class: 'empty' }, h('p', { class: 'empty-line' }, sillyFor(b.id)));
    if (ctx.editing) {
      if (b.hint) box.appendChild(h('p', { class: 'empty-hint' }, h('strong', null, 'Note to self: '), b.hint));
      box.appendChild(h('button', { type: 'button', class: 'btn btn--small', onClick: function () { RDW.editor.editBlock(ctx, b.id); } }, 'Fill this in'));
    }
    return box;
  }

  function toolbar(b, ctx) {
    var def = types[b.type];
    var mk = function (label, text, fn, extra) { return h('button', Object.assign({ type: 'button', class: 'btn btn--small', 'aria-label': label + ': ' + (b.title || b.type), title: label, onClick: fn }, extra || {}), text); };
    return h('div', { class: 'block-tools', role: 'group', 'aria-label': 'Edit tools for ' + (b.title || b.type) },
      h('span', { class: 'block-type' }, def ? def.label : b.type),
      mk('Edit', 'Edit', function () { RDW.editor.editBlock(ctx, b.id); }),
      mk('Move up', '↑', function () { RDW.editor.moveBlock(ctx, b.id, -1); }),
      mk('Move down', '↓', function () { RDW.editor.moveBlock(ctx, b.id, 1); }),
      mk(b.archived ? 'Restore' : 'Archive', b.archived ? 'Restore' : 'Archive', function () { RDW.editor.archiveBlock(ctx, b.id); }),
      mk('Delete', 'Delete', function () { RDW.editor.deleteBlock(ctx, b.id); }, { class: 'btn btn--small btn--danger' }));
  }

  function renderBlock(b, ctx) {
    var def = types[b.type];
    var sec = h('section', { class: 'block block--' + b.type + (b.archived ? ' is-archived' : ''), id: 'b-' + b.id, 'data-block': b.id, 'aria-labelledby': 'bt-' + b.id });
    var head = h('div', { class: 'block-head' },
      h('h2', { class: 'block-title', id: 'bt-' + b.id }, b.title || '(untitled block)'));
    if (b.archived) head.appendChild(h('span', { class: 'tag tag--archived' }, 'Archived'));
    if (ctx.editing) head.appendChild(toolbar(b, ctx));
    sec.appendChild(head);
    if (!def) { sec.appendChild(h('p', { class: 'muted' }, 'Unknown block type "' + b.type + '". The data is safe; this site just doesn\'t know how to draw it.')); return sec; }
    var empty = def.isEmpty(b, ctx);
    var body = h('div', { class: 'block-body' });
    try { body.appendChild(empty ? emptyState(b, ctx) : def.render(b, ctx)); }
    catch (err) { console.error(err); body.appendChild(h('p', { class: 'muted' }, 'This block failed to draw (' + err.message + '). Open Edit to check its data.')); }
    sec.classList.toggle('is-empty', empty);
    sec.appendChild(body);
    return sec;
  }

  RDW.blocks = {
    types: types, register: register, renderBlock: renderBlock, silly: sillyFor,
    isEmpty: function (b, ctx) { return types[b.type] ? types[b.type].isEmpty(b, ctx || {}) : false; },
    schemaFor: function (b, ctx) { return types[b.type] ? types[b.type].schema(b, ctx) : []; },
    create: function (type, title, group) {
      var def = types[type]; var b = Object.assign({ id: RDW.uid('blk'), type: type, title: title || ('New ' + def.label.toLowerCase()), group: group || '', hint: '' }, def.empty());
      return b;
    },
    addable: function () { return Object.keys(types).filter(function (t) { return !types[t].hidden; }); }
  };
})();
