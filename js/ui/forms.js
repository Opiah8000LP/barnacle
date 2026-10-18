/* ==========================================================================
   forms.js — builds editor forms from a plain list of field descriptions.
   Add a field to a block type's schema and a form control just… appears.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW; var h = RDW.h;

  function wrap(def, control, id) {
    var f = h('div', { class: 'field' });
    if (def.label) f.appendChild(h('label', { for: id }, def.label));
    f.appendChild(control);
    if (def.help) f.appendChild(h('p', { class: 'help' }, def.help));
    return f;
  }

  function rowControls(host, node, onChange) {
    var move = function (d) {
      var sib = d < 0 ? node.previousElementSibling : node.nextElementSibling;
      if (!sib || !sib.classList.contains('row')) return;
      if (d < 0) host.insertBefore(node, sib); else host.insertBefore(sib, node);
      if (onChange) onChange();
    };
    return h('span', { class: 'row-ctl' },
      h('button', { type: 'button', class: 'iconbtn iconbtn--tiny', 'aria-label': 'Move up', title: 'Move up', onClick: function () { move(-1); } }, '↑'),
      h('button', { type: 'button', class: 'iconbtn iconbtn--tiny', 'aria-label': 'Move down', title: 'Move down', onClick: function () { move(1); } }, '↓'),
      h('button', { type: 'button', class: 'iconbtn iconbtn--tiny', 'aria-label': 'Remove', title: 'Remove', onClick: function () { node.remove(); if (onChange) onChange(); } }, '✕'));
  }

  var kinds = {
    /** carries a value through untouched (ids, mostly) */
    hidden: function (def, val) { return { el: h('span', { hidden: true }), get: function () { return val; } }; },
    text: function (def, val) {
      var id = RDW.uid('f'); var i = h('input', { type: 'text', id: id, value: val == null ? '' : val, placeholder: def.placeholder || '', autocomplete: 'off' });
      return { el: wrap(def, i, id), get: function () { return i.value.trim(); } };
    },
    textarea: function (def, val) {
      var id = RDW.uid('f'); var t = h('textarea', { id: id, rows: def.rows || 4, placeholder: def.placeholder || '' }); t.value = val == null ? '' : val;
      return { el: wrap(def, t, id), get: function () { return t.value.replace(/\s+$/, ''); } };
    },
    number: function (def, val) {
      var id = RDW.uid('f'); var i = h('input', { type: 'number', id: id, value: val == null ? '' : val, step: def.step || 'any', min: def.min, max: def.max });
      return { el: wrap(def, i, id), get: function () { return i.value === '' ? '' : Number(i.value); } };
    },
    date: function (def, val) { return inputOfType('date', def, val); },
    month: function (def, val) { return inputOfType('month', def, val); },
    datetime: function (def, val) { return inputOfType('datetime-local', def, val); },
    color: function (def, val) {
      var id = RDW.uid('f'); var i = h('input', { type: 'color', id: id, value: /^#[0-9a-f]{6}$/i.test(val) ? val : '#000000' });
      return { el: wrap(def, i, id), get: function () { return i.value; } };
    },
    checkbox: function (def, val) {
      var id = RDW.uid('f'); var i = h('input', { type: 'checkbox', id: id }); i.checked = !!val;
      var f = h('div', { class: 'field field--check' }, i, h('label', { for: id }, def.label));
      if (def.help) f.appendChild(h('p', { class: 'help' }, def.help));
      return { el: f, get: function () { return i.checked; } };
    },
    select: function (def, val) {
      var id = RDW.uid('f');
      var s = h('select', { id: id }, def.options.map(function (o) {
        var v = typeof o === 'object' ? o.value : o, l = typeof o === 'object' ? o.label : o;
        return h('option', { value: v, selected: String(v) === String(val) }, l);
      }));
      return { el: wrap(def, s, id), get: function () { return s.value; } };
    },
    /** one item per line */
    lines: function (def, val) {
      var id = RDW.uid('f'); var t = h('textarea', { id: id, rows: def.rows || 6, placeholder: def.placeholder || 'One per line' });
      t.value = RDW.asArray(val).join('\n');
      var d = Object.assign({ help: 'One per line. Use <Secret&5> for a 5-character black censor bar.' }, def);
      return { el: wrap(d, t, id), get: function () { return t.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); } };
    },
    /** comma or line separated */
    tags: function (def, val) {
      var id = RDW.uid('f'); var t = h('textarea', { id: id, rows: 3, placeholder: def.placeholder || 'Separate with commas or new lines' });
      t.value = RDW.asArray(val).join(', ');
      return { el: wrap(def, t, id), get: function () { return t.value.split(/[\n,]/).map(function (x) { return x.trim(); }).filter(Boolean); } };
    },
    /** several paragraphs, each its own box */
    paragraphs: function (def, val) {
      var host = h('div', { class: 'rows' });
      var addBtn;
      function addRow(text) {
        var ta = h('textarea', { rows: 4, 'aria-label': (def.label || 'Paragraph') + ' paragraph' }); ta.value = text || '';
        var row = h('div', { class: 'row row--para' }, ta);
        row.appendChild(rowControls(host, row));
        host.appendChild(row); return ta;
      }
      if (RDW.asArray(val).length) RDW.asArray(val).forEach(function (t) { addRow(t); }); else addRow('');
      addBtn = h('button', { type: 'button', class: 'btn btn--small', onClick: function () { addRow('').focus(); } }, '+ Add paragraph');
      var id = RDW.uid('f');
      var f = h('div', { class: 'field' }, h('span', { class: 'label', id: id }, def.label), host, h('div', null, addBtn),
        h('p', { class: 'help' }, def.help || 'Each box is one paragraph. Use <Secret&5> for a 5-character black censor bar.'));
      return { el: f, get: function () { return RDW.$$('textarea', host).map(function (t) { return t.value.replace(/\s+$/, ''); }).filter(function (x) { return x.trim() !== ''; }); } };
    },
    image: function (def, val) {
      var id = RDW.uid('f');
      var i = h('input', { type: 'text', id: id, value: val || '', placeholder: def.placeholder || 'file name, e.g. my-art.png' });
      var prev = h('div', { class: 'img-prev', 'data-no-hit': '' });
      var update = RDW.debounce(function () {
        RDW.clear(prev);
        var v = i.value.trim(); if (!v) return;
        var img = h('img', { alt: '', src: RDW.resolveAsset(v, def.folder), onError: function () { RDW.clear(prev); prev.appendChild(h('span', { class: 'muted' }, 'Not found at ' + RDW.resolveAsset(v, def.folder))); } });
        prev.appendChild(img);
      }, 250);
      i.addEventListener('input', update); update();
      var f = wrap(Object.assign({ help: 'Just the file name. It is looked for in ' + (def.folder || 'the images folder') + '. (A full https:// link also works.)' }, def), i, id);
      f.appendChild(prev);
      return { el: f, get: function () { return i.value.trim(); } };
    },
    /** array of objects */
    list: function (def, val) {
      var host = h('div', { class: 'rows' });
      var items = RDW.asArray(val);
      function itemTitle(vals, n) {
        var t = def.summary ? def.summary(vals) : '';
        return (t && String(t).trim()) ? String(t).trim().slice(0, 70) : (def.itemLabel || 'Item') + ' ' + n;
      }
      function addRow(vals, open) {
        var sub = build(def.itemSchema, vals || (def.newItem ? def.newItem() : {}));
        var sum = h('summary', null, h('span', { class: 'row-title' }, itemTitle(vals || {}, host.children.length + 1)));
        var det = h('details', { class: 'row row--item' }, sum, h('div', { class: 'row-body' }, sub.el));
        if (open) det.open = true;
        sum.appendChild(rowControls(host, det, function () { renumber(); }));
        det._get = sub.get;
        det.addEventListener('input', RDW.debounce(function () { sum.firstChild.textContent = itemTitle(sub.get(), RDW.$$('.row--item', host).indexOf(det) + 1); }, 200));
        // clicks on the little arrows should not toggle the details
        sum.addEventListener('click', function (ev) { if (ev.target.closest('.row-ctl')) ev.preventDefault(); });
        host.appendChild(det); return det;
      }
      function renumber() { RDW.$$('.row--item', host).forEach(function (d, i) { var v = d._get(); d.querySelector('.row-title').textContent = itemTitle(v, i + 1); }); }
      items.forEach(function (it, i) { addRow(it, items.length <= 3 && i < 3); });
      var add = h('button', { type: 'button', class: 'btn btn--small', onClick: function () { var d = addRow(null, true); var fi = d.querySelector('input, textarea, select'); if (fi) fi.focus(); d.scrollIntoView({ block: 'nearest' }); } }, '+ Add ' + (def.itemLabel || 'item').toLowerCase());
      var f = h('div', { class: 'field field--list' }, h('span', { class: 'label' }, def.label), host, h('div', { class: 'row-add' }, add));
      if (def.bulkKey) {
        var bulk = h('textarea', { rows: 3, placeholder: def.bulkPlaceholder || 'one file name per line', 'aria-label': 'Add many at once' });
        f.appendChild(h('details', { class: 'bulk' }, h('summary', null, 'Add many at once'),
          bulk, h('button', { type: 'button', class: 'btn btn--small', onClick: function () {
            bulk.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (name) {
              var o = def.newItem ? def.newItem() : {}; o[def.bulkKey] = name; addRow(o, false);
            }); bulk.value = '';
          } }, 'Add these')));
      }
      if (def.help) f.appendChild(h('p', { class: 'help' }, def.help));
      return { el: f, get: function () { return RDW.$$('.row--item', host).map(function (d) { return d._get(); }); } };
    }
  };

  function inputOfType(type, def, val) {
    var id = RDW.uid('f'); var i = h('input', { type: type, id: id, value: val == null ? '' : val });
    return { el: wrap(def, i, id), get: function () { return i.value; } };
  }

  /** build(schema, values) -> { el, get() } */
  function build(schema, values) {
    values = values || {};
    var root = h('div', { class: 'form' });
    var parts = schema.map(function (def) {
      var k = kinds[def.kind || 'text'];
      if (!k) throw new Error('Unknown field kind: ' + def.kind);
      var p = k(def, values[def.key]); root.appendChild(p.el); return { def: def, p: p };
    });
    return {
      el: root,
      get: function () { var out = {}; parts.forEach(function (x) { out[x.def.key] = x.p.get(); }); return out; }
    };
  }

  RDW.forms = { build: build, kinds: kinds };
})();
