/* ==========================================================================
   shortcuts.js — keyboard shortcuts (they step aside while you are typing).
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW;

  function typing(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) && !(t.type === 'range' || t.type === 'checkbox' || t.type === 'radio'); }
  function modalOpen() { return !!document.querySelector('dialog[open], .lb'); }

  function init() {
    document.addEventListener('keydown', function (e) {
      var search = document.getElementById('global-search');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!modalOpen()) { search.focus(); search.select(); } return; }
      if (e.key === 'Escape') {
        if (modalOpen()) return;
        var menu = document.getElementById('menu');
        if (menu && menu.classList.contains('is-open')) { RDW.stage.closeSheet(); return; }
        if (!typing(e.target)) RDW.search.clearHighlight();
        return;
      }
      if (typing(e.target) || modalOpen() || e.ctrlKey || e.metaKey) return;

      if (e.altKey && !e.shiftKey) {
        if (e.key === 'ArrowUp') { e.preventDefault(); RDW.stage.stepBlock(-1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); RDW.stage.stepBlock(1); }
        return;
      }
      if (e.shiftKey && !e.altKey) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); RDW.player.prev(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); RDW.player.next(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); RDW.player.volumeBy(0.05); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); RDW.player.volumeBy(-0.05); }
        else if (e.key === '?') { e.preventDefault(); RDW.ui.helpDialog(); }
        return;
      }
      if (e.altKey) return;
      switch (e.key) {
        case '/': e.preventDefault(); search.focus(); search.select(); break;
        case '[': RDW.stage.step(-1); break;
        case ']': RDW.stage.step(1); break;
        case 'e': case 'E': if (RDW.site.allowEditing !== false) RDW.editor.toggle(); break;
        case 's': case 'S': RDW.ui.settingsDialog(); break;
        case 'm': case 'M': RDW.player.toggleMute(); break;
        case 'p': case 'P': if (RDW.player.hasTracks()) RDW.player.toggle(); break;
        case 't': case 'T': { var order = ['auto', 'light', 'dark']; var next = order[(order.indexOf(RDW.settings.get('theme')) + 1) % 3]; RDW.settings.set('theme', next); RDW.toast('Theme: ' + next); break; }
        case '?': RDW.ui.helpDialog(); break;
        default: break;
      }
    });
  }
  RDW.shortcuts = { init: init };
})();
