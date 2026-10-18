/* ==========================================================================
   settings-dialog.js — Settings, Content & backup, and the shortcuts cheat sheet.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW; var h = RDW.h;
  RDW.ui = RDW.ui || {};

  function segmented(name, label, options, key) {
    var cur = String(RDW.settings.get(key));
    var group = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label }, options.map(function (o) {
      var id = RDW.uid(name);
      var input = h('input', { type: 'radio', name: name, id: id, value: String(o.value), checked: String(o.value) === cur,
        onChange: function () { RDW.settings.set(key, o.value); RDW.sfx.play('click'); } });
      return h('label', { for: id }, input, h('span', null, o.label));
    }));
    return h('div', { class: 'field' }, h('span', { class: 'label' }, label), group);
  }
  function range(label, key, min, max, step, fmt, onInput) {
    var id = RDW.uid('rg');
    var out = h('output', { for: id, class: 'range-out' }, fmt(RDW.settings.get(key)));
    var input = h('input', { type: 'range', id: id, min: min, max: max, step: step, value: RDW.settings.get(key),
      onInput: function () { var v = Number(input.value); out.textContent = fmt(v); RDW.settings.set(key, v); if (onInput) onInput(v); } });
    return h('div', { class: 'field' }, h('label', { for: id }, label, ' ', out), input);
  }
  function check(label, key, help) {
    var id = RDW.uid('ck'); var i = h('input', { type: 'checkbox', id: id, onChange: function () { RDW.settings.set(key, i.checked); RDW.sfx.play('click'); } });
    i.checked = !!RDW.settings.get(key);
    return h('div', { class: 'field field--check' }, i, h('label', { for: id }, label), help ? h('p', { class: 'help' }, help) : null);
  }

  function settingsDialog() {
    var pct = function (v) { return Math.round(v * 100) + '%'; };
    var body = h('div', { class: 'settings' },
      h('fieldset', null, h('legend', { class: 'label' }, 'Look'),
        segmented('theme', 'Theme', [{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], 'theme'),
        range('Text size', 'textScale', 0.85, 1.6, 0.05, pct),
        segmented('lh', 'Line spacing', [{ value: 1, label: 'Normal' }, { value: 1.2, label: 'Roomy' }, { value: 1.4, label: 'Airy' }], 'lineSpacing'),
        check('Easy-to-read font', 'readableFont', 'Swaps to a plainer, wider-spaced font.')),
      h('fieldset', null, h('legend', { class: 'label' }, 'Motion & contrast'),
        segmented('motion', 'Animations', [{ value: 'auto', label: 'Match my device' }, { value: 'reduce', label: 'Reduced' }, { value: 'full', label: 'Full' }], 'motion'),
        segmented('tilt', '3D tilt following the pointer', [{ value: 'full', label: 'Full' }, { value: 'low', label: 'Gentle' }, { value: 'off', label: 'Off' }], 'tilt'),
        segmented('contrast', 'Contrast', [{ value: 'auto', label: 'Match my device' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }], 'contrast'),
        check('Hatch patterns in charts', 'chartPatterns', 'Charts use patterns and shapes, not just shades of grey. Turn off for plain greys.')),
      h('fieldset', null, h('legend', { class: 'label' }, 'Sound'),
        range('Music volume', 'musicVolume', 0, 1, 0.01, pct, function (v) { RDW.player.setVolumeFromSettings(v); }),
        range('Interface sound volume', 'sfxVolume', 0, 1, 0.01, pct),
        check('Start music when I tap to enter', 'autoplay')),
      h('fieldset', null, h('legend', { class: 'label' }, 'Search'),
        check('Jump to the best match while I type', 'autoJump', 'Otherwise press Enter or click a result.')),
      h('p', null, h('button', { type: 'button', class: 'btn btn--small', onClick: function () { RDW.settings.reset(); RDW.player.setVolumeFromSettings(RDW.settings.get('musicVolume')); RDW.toast('Settings reset.'); RDW.ui.settingsDialog._dlg.close(); settingsDialog(); } }, 'Reset all settings')));
    if (RDW.site && RDW.site.allowEditing !== false) body.appendChild(h('p', null, h('button', { type: 'button', class: 'btn btn--small', onClick: function () { RDW.ui.contentDialog(); } }, 'Content, backup & files…')));
    RDW.ui.settingsDialog._dlg = RDW.dialog.open({ title: 'Settings', size: 'wide', id: 'settings', body: body, actions: [{ label: 'Done', primary: true }] });
  }
  RDW.ui.settingsDialog = settingsDialog;

  /* ---- content & backup ----------------------------------------------------------- */
  function contentDialog() {
    var body = h('div', { class: 'content-mgr' });
    var dlg;
    function names(key) {
      if (key === '_nav') return 'Section list & order';
      if (key === '_playlist') return 'Music playlist';
      if (key === '_letter') return 'Sealed letter';
      var s = RDW.nav.find(key); return s ? s.title : key;
    }
    function draw() {
      RDW.clear(body);
      var keys = RDW.store.keys().sort(function (a, b) { return (RDW.store.isDirty(b) ? 1 : 0) - (RDW.store.isDirty(a) ? 1 : 0); });
      var dirty = RDW.store.dirtyKeys();
      body.appendChild(h('p', null, 'Edits are saved ', h('strong', null, 'only in this browser'), ' until you turn them into files. To publish: download the changed files, put them in the matching folder of the project (same names), and commit.'));
      var list = h('ul', { class: 'file-list' });
      keys.forEach(function (k) {
        var d = RDW.store.isDirty(k);
        list.appendChild(h('li', { class: 'file-row' + (d ? ' is-dirty' : '') },
          h('div', null, h('strong', null, names(k)), h('br'), h('code', null, RDW.store.filePath(k))),
          h('span', { class: 'tag' }, d ? 'changed' : 'same as file'),
          d ? h('button', { type: 'button', class: 'btn btn--small', onClick: function () { RDW.store.downloadFile(k); } }, 'Download') : null,
          d ? h('button', { type: 'button', class: 'btn btn--small btn--danger', onClick: function () { RDW.dialog.confirm('Throw away your browser edits to "' + names(k) + '" and go back to the file version?', 'Discard edits', { danger: true }).then(function (ok) { if (ok) { RDW.store.reset(k); draw(); } }); } }, 'Discard') : null));
      });
      body.appendChild(list);
      var tools = h('div', { class: 'content-tools' },
        h('button', { type: 'button', class: 'btn', disabled: !dirty.length, onClick: function () { dirty.forEach(function (k, i) { setTimeout(function () { RDW.store.downloadFile(k); }, i * 400); }); RDW.toast('Downloading ' + dirty.length + ' file' + (dirty.length === 1 ? '' : 's') + '… (allow multiple downloads if asked)'); } }, 'Download all changed files'),
        h('button', { type: 'button', class: 'btn', onClick: function () { RDW.download('rdweeb-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(RDW.store.backup(), null, 2), 'application/json'); } }, 'Save full backup (.json)'),
        h('button', { type: 'button', class: 'btn', onClick: function () { picker.click(); } }, 'Restore from backup…'));
      var picker = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onChange: function () {
        var f = picker.files[0]; if (!f) return;
        var r = new FileReader();
        r.onload = function () { try { RDW.store.restore(JSON.parse(r.result)); RDW.toast('Backup restored into this browser.'); draw(); RDW.stage.refresh(); RDW.stage.rebuildNav(); } catch (e) { RDW.toast('Could not restore: ' + e.message); } };
        r.readAsText(f);
      } });
      body.appendChild(tools); body.appendChild(picker);
      var parked = RDW.store.parkedKeys();
      if (parked.length) {
        body.appendChild(h('h3', { class: 'sub' }, 'Parked drafts'));
        body.appendChild(h('p', { class: 'muted' }, 'These browser drafts were set aside because their data file changed afterwards.'));
        parked.forEach(function (k) { body.appendChild(h('p', null, names(k) + ' ', h('button', { type: 'button', class: 'btn btn--small', onClick: function () { RDW.store.restoreParked(k); draw(); } }, 'Restore draft'))); });
      }
    }
    draw();
    dlg = RDW.dialog.open({ title: 'Content, backup & files', size: 'wide', id: 'content', body: body, actions: [{ label: 'Close', primary: true }] });
  }
  RDW.ui.contentDialog = contentDialog;

  /* ---- shortcuts ------------------------------------------------------------------ */
  function helpDialog() {
    var rows = [
      ['/  or  Ctrl+K', 'Focus the search bar'], ['[  and  ]', 'Previous / next section'], ['Alt + ↑ / ↓', 'Previous / next subsection'],
      ['E', 'Toggle edit mode'], ['S', 'Open settings'], ['M', 'Mute / unmute music'], ['P', 'Play / pause music'],
      ['Shift + ← / →', 'Previous / next track'], ['Shift + ↑ / ↓', 'Music volume'], ['T', 'Cycle theme'], ['?', 'This cheat sheet'], ['Esc', 'Close dialogs, clear search highlight']
    ];
    var t = h('table', { class: 'data-table keys' }, h('caption', { class: 'sr-only' }, 'Keyboard shortcuts'), h('tbody', null, rows.map(function (r) {
      return h('tr', null, h('th', { scope: 'row' }, r[0].split('  ').map(function (k, i) { return k === 'or' || k === 'and' ? ' ' + k + ' ' : h('span', { class: 'kbd' }, k); })), h('td', null, r[1]));
    })));
    RDW.dialog.open({ title: 'Keyboard shortcuts', id: 'help', body: h('div', null, t,
      h('p', { class: 'muted' }, 'On a phone: swipe left/right on the page to change section. Tap the contents button for subsections. Shortcuts pause while you are typing in a box.')),
      actions: [{ label: 'Got it', primary: true }] });
  }
  RDW.ui.helpDialog = helpDialog;
})();
