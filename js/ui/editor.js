/* ==========================================================================
   editor.js — edit mode. Add, edit, reorder, archive and delete content
   without ever opening a code file. Press E (or the pencil button).
   Everything saves as a draft in THIS browser; "Download" turns it into
   the real data files (see the editbar and Settings → Content).
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW; var h = RDW.h;

  RDW.editing = false;

  function listFor(doc, ctx) {
    if (ctx.pageId) {
      var p = (doc.pages || []).filter(function (x) { return x.id === ctx.pageId; })[0];
      if (!p) return [];
      p.blocks = p.blocks || []; return p.blocks;
    }
    doc.blocks = doc.blocks || []; return doc.blocks;
  }
  function withBlocks(ctx, fn) { RDW.store.mutate(ctx.sectionId, function (doc) { fn(listFor(doc, ctx), doc); }); }
  function findBlock(ctx, id) {
    var doc = RDW.store.get(ctx.sectionId); if (!doc) return null;
    return listFor(RDW.clone(doc), ctx).filter(function (b) { return b.id === id; })[0] || null;
  }
  function focusAfter(id) { RDW.editor._focusAfter = id; }

  /* ---- block actions ------------------------------------------------------------ */
  function editBlock(ctx, id) {
    var b = findBlock(ctx, id); if (!b) return;
    var def = RDW.blocks.types[b.type];
    var common = [
      { key: 'title', label: 'Title', help: 'Shown as the heading and in the side menu.' },
      { key: 'group', label: 'Menu group (optional)', help: 'Blocks with the same group are listed together in the side menu.' }
    ];
    var typeSchema = RDW.blocks.schemaFor(b, ctx);
    var note = [{ key: 'hint', kind: 'textarea', rows: 2, label: 'Note to self (only visible in Edit mode)', help: 'A reminder of what belongs here.' }];
    var form = RDW.forms.build(common.concat(typeSchema, note), b);
    RDW.dialog.open({
      title: 'Edit: ' + (b.title || (def && def.label) || 'block'), size: 'wide', id: 'editblock', body: form.el,
      actions: [
        { label: 'Cancel' },
        { label: 'Save', primary: true, onClick: function () {
          var v = form.get(); focusAfter(id);
          withBlocks(ctx, function (arr) { var i = arr.map(function (x) { return x.id; }).indexOf(id); if (i > -1) arr[i] = Object.assign({}, arr[i], v); });
          RDW.toast('Saved in this browser. Download your files when you are done.');
        } }
      ]
    });
  }
  function moveBlock(ctx, id, dir) {
    focusAfter(id);
    withBlocks(ctx, function (arr) {
      var i = arr.map(function (x) { return x.id; }).indexOf(id), j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    });
    RDW.announce('Moved ' + (dir < 0 ? 'up' : 'down'));
  }
  function archiveBlock(ctx, id) {
    focusAfter(id);
    withBlocks(ctx, function (arr) { var b = arr.filter(function (x) { return x.id === id; })[0]; if (b) b.archived = !b.archived; });
  }
  function deleteBlock(ctx, id) {
    var b = findBlock(ctx, id); if (!b) return;
    RDW.dialog.confirm('Delete "' + (b.title || 'this block') + '" and everything in it? (Archiving keeps it safe but hidden.)', 'Delete it', { danger: true, title: 'Delete block?' }).then(function (ok) {
      if (ok) withBlocks(ctx, function (arr) { var i = arr.map(function (x) { return x.id; }).indexOf(id); if (i > -1) arr.splice(i, 1); });
    });
  }
  function addBlock(ctx, presetType) {
    var types = RDW.blocks.addable();
    var chosen = presetType || 'paragraph';
    var title = h('input', { type: 'text', placeholder: 'e.g. Things that annoy me', autofocus: true, 'aria-label': 'Block title' });
    var group = h('input', { type: 'text', placeholder: 'optional, e.g. Music', 'aria-label': 'Menu group' });
    var radios = h('div', { class: 'type-picker', role: 'radiogroup', 'aria-label': 'Block type' }, types.map(function (t) {
      var def = RDW.blocks.types[t]; var id = RDW.uid('bt');
      var r = h('input', { type: 'radio', name: 'bt', id: id, value: t, checked: t === chosen, onChange: function () { chosen = t; } });
      return h('label', { class: 'type-opt', for: id }, r, h('span', null, h('strong', null, def.label), h('small', { class: 'muted' }, def.description || '')));
    }));
    RDW.dialog.open({ title: 'Add a block', size: 'wide', id: 'addblock', body: h('div', null,
      h('div', { class: 'field' }, h('label', null, 'Title'), title),
      h('div', { class: 'field' }, h('label', null, 'Menu group (optional)'), group),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'What kind of block?'), radios)),
      actions: [{ label: 'Cancel' }, { label: 'Create', primary: true, onClick: function () {
        var b = RDW.blocks.create(chosen, title.value.trim() || undefined, group.value.trim());
        withBlocks(ctx, function (arr) { arr.push(b); });
        setTimeout(function () { RDW.router.go(ctx.sectionId, { page: ctx.pageId, block: b.id }); editBlock(ctx, b.id); }, 60);
      } }] });
  }
  function addParagraph(ctx) {
    var b = RDW.blocks.create('paragraph', 'New paragraph');
    withBlocks(ctx, function (arr) { arr.push(b); });
    setTimeout(function () { RDW.router.go(ctx.sectionId, { page: ctx.pageId, block: b.id }); editBlock(ctx, b.id); }, 60);
  }

  /* ---- years ---------------------------------------------------------------------- */
  var YEAR_BLOCKS = [
    ['year-preview', 'fields', 'This Year in My Life — preview', 'Overview', { items: [{ label: 'Headline', value: '' }, { label: 'Theme word', value: '' }, { label: 'Mood', value: '' }, { label: 'Favourite memory', value: '' }] }, 'Shown on the dashboard when this is the current year.'],
    ['year-summary', 'paragraph', 'Annual summary', 'Overview', { text: [], more: [] }, 'Several paragraphs about the year.'],
    ['year-milestones', 'timeline', 'Major milestones', 'Overview', { items: [], order: 'oldest' }, ''],
    ['year-hobbies', 'list', 'New hobbies & skills', 'Growth', { items: [], ordered: false }, ''],
    ['year-started', 'list', 'Projects started', 'Growth', { items: [], ordered: false }, ''],
    ['year-completed', 'list', 'Projects completed', 'Growth', { items: [], ordered: false }, ''],
    ['year-media', 'list', 'Favourite media', 'Taste', { items: [], ordered: false }, 'Games, shows, songs, books…'],
    ['year-moments', 'cards', 'Memorable moments', 'Memories', { items: [] }, ''],
    ['year-photos', 'gallery', 'Photos, screenshots & other media', 'Memories', { items: [] }, '']
  ];
  function yearPage(year) {
    return { id: String(year), year: Number(year), title: String(year), blocks: YEAR_BLOCKS.map(function (d) {
      return Object.assign({ id: d[0], type: d[1], title: d[2], group: d[3], hint: d[5] }, RDW.clone(d[4]));
    }) };
  }
  function addYear(year) {
    function make(y) {
      y = parseInt(y, 10);
      if (!y || y < 1900 || y > 2200) { RDW.toast('That does not look like a year.'); return; }
      var exists = ((RDW.store.get('years') || {}).pages || []).some(function (p) { return p.id === String(y); });
      if (exists) { RDW.router.go('years', { page: String(y) }); return; }
      RDW.store.mutate('years', function (doc) { doc.pages = doc.pages || []; doc.pages.push(yearPage(y)); });
      RDW.router.go('years', { page: String(y) });
      RDW.toast(y + ' page created. Fill in what you want, skip the rest.');
    }
    if (year) return make(year);
    RDW.dialog.prompt('Which year?', String(new Date().getFullYear()), { type: 'number', title: 'Add a year', okLabel: 'Create page' }).then(function (v) { if (v) make(v); });
  }
  function archiveYear(pageId) { RDW.store.mutate('years', function (doc) { var p = (doc.pages || []).filter(function (x) { return x.id === pageId; })[0]; if (p) p.archived = !p.archived; }); }
  function deleteYear(pageId) {
    RDW.dialog.confirm('Delete the whole ' + pageId + ' page and everything on it? (Archiving keeps it safe but hidden.)', 'Delete year', { danger: true }).then(function (ok) {
      if (!ok) return;
      RDW.store.mutate('years', function (doc) { doc.pages = (doc.pages || []).filter(function (x) { return x.id !== pageId; }); });
      RDW.router.go('years');
    });
  }

  /* ---- playlist ------------------------------------------------------------------- */
  function editPlaylist() {
    var pl = RDW.store.get('_playlist') || { tracks: [] };
    var form = RDW.forms.build([{ key: 'tracks', kind: 'list', label: 'Tracks (in play order)', itemLabel: 'Track', summary: function (i) { return i.title || i.file; },
      bulkKey: 'file', bulkPlaceholder: '01-first-song.mp3\n02-second-song.mp3\n(one file name per line)',
      newItem: function () { return { file: '', title: '', artist: '', cover: '' }; },
      help: 'Put .mp3 files in the music folder and covers in the covers folder, then list the exact file names here.',
      itemSchema: [{ key: 'file', label: 'Audio file', placeholder: '01-song-name.mp3' }, { key: 'title', label: 'Title' }, { key: 'artist', label: 'Artist' },
        { key: 'cover', kind: 'image', label: 'Cover picture (optional)', folder: 'covers/', placeholder: '01-song-name.jpg' }] }], pl);
    RDW.dialog.open({ title: 'Edit playlist', size: 'wide', body: form.el, actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: function () {
      var v = form.get(); v.tracks = v.tracks.filter(function (t) { return t.file; });
      RDW.store.set('_playlist', { tracks: v.tracks }); RDW.player.reload(); RDW.toast('Playlist saved in this browser.');
    } }] });
  }

  /* ---- sections manager ------------------------------------------------------------- */
  function sectionsManager() {
    var rows = RDW.nav.list(true).map(function (s) { return { id: s.id, title: s.title, orig: s.title, hidden: s.hidden, custom: s.custom, glyph: s.glyph, removed: false }; });
    var added = [];
    var host = h('div', { class: 'rows sections-mgr' });
    function draw() {
      RDW.clear(host);
      rows.forEach(function (r, i) {
        if (r.removed) return;
        var isHome = r.id === 'home';
        var title = h('input', { type: 'text', value: r.title, 'aria-label': 'Name of section ' + r.orig, onInput: function () { r.title = title.value; } });
        var hide = h('input', { type: 'checkbox', id: 'hide-' + r.id, disabled: isHome, onChange: function () { r.hidden = hide.checked; } }); hide.checked = !!r.hidden;
        host.appendChild(h('div', { class: 'row row--sec' },
          h('span', { class: 'row-ctl' },
            h('button', { type: 'button', class: 'iconbtn iconbtn--tiny', disabled: isHome || i <= 1, 'aria-label': 'Move ' + r.orig + ' up', onClick: function () { var t = rows[i]; rows[i] = rows[i - 1]; rows[i - 1] = t; draw(); } }, '↑'),
            h('button', { type: 'button', class: 'iconbtn iconbtn--tiny', disabled: isHome || i === rows.length - 1, 'aria-label': 'Move ' + r.orig + ' down', onClick: function () { var t = rows[i]; rows[i] = rows[i + 1]; rows[i + 1] = t; draw(); } }, '↓')),
          title,
          h('label', { class: 'inline-check', for: 'hide-' + r.id }, hide, ' hide'),
          r.custom ? h('button', { type: 'button', class: 'btn btn--small btn--danger', onClick: function () { r.removed = true; draw(); } }, 'Remove') : h('span', { class: 'muted small' }, isHome ? 'always first' : '')));
      });
    }
    draw();
    var newTitle = h('input', { type: 'text', placeholder: 'New section name', 'aria-label': 'New section name' });
    var addBtn = h('button', { type: 'button', class: 'btn btn--small', onClick: function () {
      var t = newTitle.value.trim(); if (!t) return;
      var id = RDW.slug(t); while (rows.some(function (r) { return r.id === id; })) id += '-2';
      var row = { id: id, title: t, orig: t, hidden: false, custom: true, glyph: t.slice(0, 2).toUpperCase(), removed: false, isNew: true };
      rows.push(row); newTitle.value = ''; draw();
    } }, '+ Add section');
    var body = h('div', null, h('p', { class: 'muted' }, 'Reorder, rename or hide sections. New sections start empty — add blocks to them in Edit mode. (Give a new section an icon by adding icons/<its-id>.svg.)'),
      host, h('div', { class: 'row-add inline-add' }, newTitle, addBtn));
    RDW.dialog.open({ title: 'Manage sections', size: 'wide', body: body, actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: function () {
      var site = (RDW.site && RDW.site.sections) || [];
      RDW.nav.mutate(function (nav) {
        nav.order = rows.filter(function (r) { return !r.removed; }).map(function (r) { return r.id; });
        nav.hidden = rows.filter(function (r) { return r.hidden && !r.removed; }).map(function (r) { return r.id; });
        nav.titles = {};
        rows.forEach(function (r) { if (!r.removed && r.title.trim() && r.title.trim() !== r.orig) nav.titles[r.id] = r.title.trim(); else if (!r.removed && r.title.trim() && r.custom) nav.titles[r.id] = r.title.trim(); });
        var keep = (nav.extra || []).filter(function (e) { return !rows.some(function (r) { return r.id === e.id && r.removed; }); });
        rows.forEach(function (r) {
          if (r.isNew && !r.removed) { keep.push({ id: r.id, title: r.title.trim(), glyph: r.glyph, file: 'data/sections/' + r.id + '.js' }); }
        });
        nav.extra = keep;
        // custom rows renamed: keep extra.title in sync as well
        nav.extra.forEach(function (e) { var r = rows.filter(function (x) { return x.id === e.id; })[0]; if (r && !r.removed) e.title = r.title.trim() || e.title; });
      });
      rows.forEach(function (r) { if (r.isNew && !r.removed) { RDW.store.ensure('section', r.id, { id: r.id, blocks: [] }); RDW.store.set(r.id, { id: r.id, blocks: [] }); } });
      RDW.search.invalidate(); RDW.stage.rebuildNav(); RDW.toast('Sections updated.');
    } }] });
  }

  /* ---- edit mode on/off ----------------------------------------------------------- */
  function updateEditbar() {
    var bar = document.getElementById('editbar'); if (!bar) return;
    RDW.clear(bar);
    if (!RDW.editing) { bar.hidden = true; return; }
    var dirty = RDW.store.dirtyKeys();
    bar.hidden = false;
    bar.appendChild(h('span', null, dirty.length ? '✎ Editing · ' + dirty.length + ' unsaved file' + (dirty.length === 1 ? '' : 's') : '✎ Editing · nothing changed yet'));
    bar.appendChild(h('button', { type: 'button', class: 'btn', onClick: function () { RDW.ui.contentDialog(); } }, dirty.length ? 'Download changes' : 'Backup & files'));
    bar.appendChild(h('button', { type: 'button', class: 'btn', onClick: function () { setEditing(false); } }, 'Done'));
  }
  function setEditing(on) {
    if (on && RDW.site && RDW.site.allowEditing === false) { RDW.toast('Editing is switched off in data/site.js.'); return; }
    RDW.editing = !!on;
    document.documentElement.setAttribute('data-editing', on ? 'true' : 'false');
    var btn = document.getElementById('btn-edit'); if (btn) { btn.setAttribute('aria-pressed', String(!!on)); }
    var sm = document.getElementById('btn-sections'); if (sm) sm.hidden = !on;
    updateEditbar();
    RDW.player && RDW.player.rebuildUI();
    RDW.stage && RDW.stage.refresh();
    RDW.announce(on ? 'Edit mode on' : 'Edit mode off');
  }

  RDW.editor = {
    editBlock: editBlock, moveBlock: moveBlock, archiveBlock: archiveBlock, deleteBlock: deleteBlock, addBlock: addBlock, addParagraph: addParagraph,
    addYear: addYear, archiveYear: archiveYear, deleteYear: deleteYear, editPlaylist: editPlaylist, sectionsManager: sectionsManager,
    setEditing: setEditing, toggle: function () { setEditing(!RDW.editing); }, updateEditbar: updateEditbar,
    yearPage: yearPage, _focusAfter: null
  };
  RDW.store.onChange(function () { updateEditbar(); });
})();
