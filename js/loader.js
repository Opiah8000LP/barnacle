/* ==========================================================================
   loader.js — the loading screen. It really does load everything:
   every script, every data file, icons, covers, music and sounds, with a
   progress bar that tells the truth. Then you tap to enter (browsers only
   allow music after a tap, so the tap is doing real work).
   ========================================================================== */
(function () {
  'use strict';

  // Order matters here. Add a new script? Put it in the right spot in this list.
  var CODE = [
    'js/core/rdw.js', 'js/core/store.js',
    'data/site.js', 'data/nav.js',
    'js/core/settings.js', 'js/core/nav.js', 'js/core/router.js', 'js/core/search.js', 'js/core/sfx.js',
    'js/ui/dialog.js', 'js/ui/forms.js', 'js/ui/blocks.js', 'js/ui/lightbox.js', 'js/ui/player.js',
    'js/ui/charts.js', 'js/ui/dashboard.js', 'js/ui/letter.js', 'js/ui/editor.js', 'js/ui/settings-dialog.js',
    'js/ui/stage.js', 'js/ui/shortcuts.js', 'js/app.js'
  ];

  var $ = function (id) { return document.getElementById(id); };
  var fill = $('boot-fill'), bar = document.querySelector('.boot-bar'), status = $('boot-status'), logEl = $('boot-log'),
      enter = $('boot-enter'), retry = $('boot-retry'), hint = $('boot-hint'), boot = $('boot');
  var warnings = [];
  var phaseStart = 0, phaseEnd = 0;

  function progress(frac) {
    var pct = Math.round(phaseStart + (phaseEnd - phaseStart) * Math.max(0, Math.min(1, frac)));
    fill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', String(pct));
  }
  function say(t) { status.textContent = t; }
  function warn(t) { warnings.push(t); logEl.hidden = false; var li = document.createElement('li'); li.textContent = t; logEl.appendChild(li); logEl.scrollTop = logEl.scrollHeight; }
  function fatal(file, err) {
    say('Something would not load: ' + file);
    var li = document.createElement('li'); li.textContent = 'Could not load ' + file + (err ? ' (' + err + ')' : '') + '. Check that the file exists, is named exactly that, and has no typos.'; logEl.hidden = false; logEl.appendChild(li);
    retry.hidden = false; retry.onclick = function () { location.reload(); };
    enter.disabled = true;
  }

  function loadScript(src, ordered) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = src; if (ordered) s.async = false;
      s.onload = function () { resolve(src); };
      s.onerror = function () { reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  function runPhase(list, from, to, label, optional) {
    phaseStart = from; phaseEnd = to; var done = 0, n = list.length;
    progress(0);
    return Promise.all(list.map(function (src) {
      var isOptional = optional && optional(src);
      return loadScript(src, true).catch(function (e) { if (!isOptional) throw e; warn('Optional file missing: ' + src); }).then(function () { done++; say(label + ' ' + done + '/' + n); progress(done / n); });
    }));
  }

  /* ---- assets ------------------------------------------------------------------------ */
  function probeImage(src) {
    return new Promise(function (res) { var i = new Image(); i.onload = function () { res(true); }; i.onerror = function () { res(false); }; i.src = src; });
  }
  function probeAudio(src, full) {
    return new Promise(function (res) {
      var a = new Audio(), finished = false;
      var end = function (ok) { if (finished) return; finished = true; res(ok); };
      a.preload = full ? 'auto' : 'metadata';
      a.addEventListener(full ? 'canplaythrough' : 'loadedmetadata', function () { end(true); }, { once: true });
      a.addEventListener('error', function () { end(false); }, { once: true });
      setTimeout(function () { end(a.readyState >= 1); }, full ? 12000 : 6000);
      a.src = src;
    });
  }

  function loadAssets() {
    var RDW = window.RDW, site = RDW.site, jobs = [];
    var tracks = (RDW.store.get('_playlist') || { tracks: [] }).tracks.filter(function (t) { return t && t.file; });
    RDW.iconOk = {};
    RDW.nav.list(true).forEach(function (s) {
      jobs.push({ label: 'icon ' + s.id, run: function () { return probeImage(s.icon).then(function (ok) { RDW.iconOk[s.id] = ok; return ok; }); }, optional: true, path: s.icon });
    });
    tracks.forEach(function (t, i) {
      var src = RDW.resolveAsset(t.file, 'music/');
      jobs.push({ label: 'music ' + (t.title || t.file), run: function () { return probeAudio(src, i === 0); }, optional: false, path: src });
      if (t.cover) { var c = RDW.resolveAsset(t.cover, 'covers/'); jobs.push({ label: 'cover', run: function () { return probeImage(c); }, optional: true, path: c }); }
    });
    var bg = site.backgrounds || {};
    ['light', 'dark'].forEach(function (k) { if (bg[k]) jobs.push({ label: 'background', run: function () { return probeImage(bg[k]).then(function (ok) { if (!ok) RDW.bgOk = false; return ok; }); }, optional: true, path: bg[k] }); });
    var sfxNames = Object.keys(site.sfx || {}).filter(function (k) { return site.sfx[k]; });
    sfxNames.forEach(function (name) { jobs.push({ label: 'sound ' + name, run: function () { return RDW.sfx.preload((function (o) { o[name] = site.sfx[name]; return o; })({})).then(function (r) { return r[0]; }); }, optional: true, path: site.sfx[name] }); });

    phaseStart = 60; phaseEnd = 100; var done = 0;
    if (!jobs.length) { progress(1); return Promise.resolve(); }
    return Promise.all(jobs.map(function (j) {
      return j.run().catch(function () { return false; }).then(function (ok) {
        done++; say('Loading assets ' + done + '/' + jobs.length); progress(done / jobs.length);
        if (!ok) warn('Not found: ' + j.path + (j.label.indexOf('music') === 0 ? ' (listed in playlist!)' : ' (optional)'));
      });
    }));
  }

  /* ---- go ------------------------------------------------------------------------------ */
  function go() {
    // tilt the card a little with the pointer
    window.addEventListener('pointermove', function (e) { if (!boot.isConnected) return; boot.style.setProperty('--mx', ((e.clientX / innerWidth - 0.5) * 2).toFixed(2)); boot.style.setProperty('--my', ((e.clientY / innerHeight - 0.5) * 2).toFixed(2)); }, { passive: true });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.setAttribute('data-motion', 'reduced');

    say('Loading scripts…');
    var codeEnd = 0;
    runPhase(CODE, 0, 35, 'Loading scripts')
      .then(function () {
        var RDW = window.RDW, site = RDW.site;
        var nav = RDW.store.get('_nav') || { extra: [] };
        var extraFiles = (nav.extra || []).map(function (e) { return e.file || ('data/sections/' + e.id + '.js'); });
        var extraSet = {}; extraFiles.forEach(function (f) { extraSet[f] = 1; });
        var files = site.sections.map(function (s) { return s.file; }).concat(extraFiles, [site.playlistFile, site.letterFile].filter(Boolean), ['vendor/tlock.bundle.js']);
        return runPhase(files, 35, 60, 'Loading content', function (src) { return !!extraSet[src] || src.indexOf('vendor/') === 0; });
      })
      .then(function () { window.RDW.store.loadOrphans(); return loadAssets(); })
      .then(function () { say('Building the interface…'); window.RDW.app.boot(); progress(1); })
      .then(function () {
        phaseStart = 0; phaseEnd = 100; progress(1);
        document.querySelector('.boot-eyebrow').textContent = 'Ready';
        say(warnings.length ? 'Ready. (' + warnings.length + ' optional file' + (warnings.length === 1 ? '' : 's') + ' not found — that is fine.)' : 'Everything loaded.');
        var RDW = window.RDW;
        hint.textContent = RDW.player.hasTracks() && RDW.settings.get('autoplay') ? 'Tapping starts the music. Mute any time with M.' : 'Press Enter, Space, or tap anywhere.';
        enter.disabled = false; boot.classList.add('is-ready'); enter.focus();
        var entered = false;
        var doEnter = function () { if (entered) return; entered = true; window.RDW.app.enter(); };
        enter.addEventListener('click', function (e) { e.stopPropagation(); doEnter(); });
        boot.addEventListener('click', doEnter);
        document.addEventListener('keydown', function onk(e) { if (entered) { document.removeEventListener('keydown', onk); return; } if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doEnter(); } });
      })
      .catch(function (err) { fatal(err && err.message ? err.message : 'a file', ''); console.error(err); });
  }
  go();
})();
