/* ==========================================================================
   app.js — glue. boot() builds everything behind the gate; enter() opens it.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW;

  RDW.app = {
    boot: function () {
      RDW.store.loadOrphans();
      RDW.stage.init();
      RDW.player.init();
      RDW.shortcuts.init();
      RDW.settings.onChange(function (k) { if (k === 'musicVolume') { /* player listens via setVolumeFromSettings */ } });
    },
    enter: function () {
      RDW.sfx.arm();
      document.getElementById('app').hidden = false;
      RDW.stage.enter();
      RDW.router.start();
      RDW.player.startFromGate();
      RDW.sfx.play('enter');
      var boot = document.getElementById('boot');
      boot.classList.add('is-leaving');
      setTimeout(function () { boot.remove(); }, 700);
      RDW.notices.forEach(function (n, i) { setTimeout(function () { RDW.toast(n, 7000); }, 1200 + i * 400); });
      RDW.notices = [];
    }
  };
})();
