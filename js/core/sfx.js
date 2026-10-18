/* ==========================================================================
   sfx.js — tiny interface sounds (click, hover, open, close, enter).
   There are NO sound files in this project. Drop your own into /sfx and list
   them in data/site.js. Missing file = silence, and silence never crashed anyone.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW;
  var bank = {};      // name -> Audio element that loaded fine
  var armed = false;  // only after the "tap to enter" gesture
  var lastHover = 0;

  RDW.sfx = {
    /** Resolves with {name: true/false}. Never rejects. */
    preload: function (map, onEach) {
      var names = Object.keys(map || {}).filter(function (n) { return map[n]; });
      return Promise.all(names.map(function (name) {
        return new Promise(function (resolve) {
          var a = new Audio();
          var done = function (ok) { if (ok) bank[name] = a; if (onEach) onEach(name, map[name], ok); resolve(ok); };
          a.preload = 'auto';
          a.addEventListener('canplaythrough', function () { done(true); }, { once: true });
          a.addEventListener('error', function () { done(false); }, { once: true });
          setTimeout(function () { done(!!a.readyState); }, 6000);
          a.src = map[name];
        });
      }));
    },
    arm: function () { armed = true; },
    has: function (name) { return !!bank[name]; },
    play: function (name) {
      if (!armed || !bank[name]) return;
      var vol = RDW.settings.get('sfxVolume');
      if (!vol) return;
      if (name === 'hover') { var now = Date.now(); if (now - lastHover < 90) return; lastHover = now; }
      try {
        var a = bank[name].cloneNode();
        a.volume = RDW.clamp(vol, 0, 1);
        var p = a.play(); if (p && p.catch) p.catch(function () { /* autoplay said no */ });
      } catch (e) { /* silence is golden */ }
    }
  };
})();
