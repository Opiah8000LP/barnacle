/* ==========================================================================
   settings.js — preferences that stick around (theme, text size, motion, sound…)
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW;

  var DEFAULTS = {
    theme: 'auto',        // auto | light | dark
    motion: 'auto',       // auto | reduce | full
    contrast: 'auto',     // auto | high | normal
    tilt: 'full',         // full | low | off
    textScale: 1,         // 0.85 – 1.6
    lineSpacing: 1,       // 1 | 1.2 | 1.4
    readableFont: false,
    chartPatterns: true,  // hatch patterns in charts so you never rely on shade alone
    musicVolume: 0.7,
    sfxVolume: 0.5,
    autoplay: true,       // start music when you tap to enter
    autoJump: false       // jump to the best search hit while typing
  };

  var values = Object.assign({}, DEFAULTS, RDW.storage.get('settings', {}));
  var listeners = [];
  var mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  var mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqContrast = window.matchMedia('(prefers-contrast: more)');

  function apply() {
    var root = document.documentElement;
    var theme = values.theme === 'auto' ? (mqDark.matches ? 'dark' : 'light') : values.theme;
    var motion = values.motion === 'auto' ? (mqMotion.matches ? 'reduced' : 'full') : (values.motion === 'reduce' ? 'reduced' : 'full');
    var contrast = values.contrast === 'auto' ? (mqContrast.matches ? 'high' : 'normal') : values.contrast;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-motion', motion);
    root.setAttribute('data-contrast', contrast);
    root.setAttribute('data-tilt', values.tilt);
    root.setAttribute('data-readable', values.readableFont ? 'true' : 'false');
    root.setAttribute('data-patterns', values.chartPatterns ? 'true' : 'false');
    root.style.setProperty('--text-scale', String(values.textScale));
    root.style.setProperty('--line-gap', String(values.lineSpacing));
  }

  RDW.settings = {
    DEFAULTS: DEFAULTS,
    get: function (k) { return values[k]; },
    all: function () { return Object.assign({}, values); },
    set: function (k, v) {
      values[k] = v; RDW.storage.set('settings', values); apply();
      listeners.slice().forEach(function (fn) { fn(k, v); });
    },
    reset: function () {
      Object.keys(values).forEach(function (k) { values[k] = DEFAULTS[k]; });
      RDW.storage.remove('settings'); apply();
      listeners.slice().forEach(function (fn) { fn('*', null); });
    },
    onChange: function (fn) { listeners.push(fn); },
    apply: apply
  };

  [mqDark, mqMotion, mqContrast].forEach(function (mq) {
    var h = function () { apply(); listeners.slice().forEach(function (fn) { fn('system', null); }); };
    if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
  });

  apply();
})();
