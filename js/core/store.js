/* ==========================================================================
   store.js — where content lives.

   • Data files in /data call RDW.defineSection({...}) etc. That is the "official" copy.
   • Edits made in the browser are saved as a DRAFT in localStorage (only on that browser!).
   • "Download" in the editor turns a draft back into a data file you drop into the repo.
   • If a data file changes underneath an old draft, the draft is parked as a backup
     instead of silently winning. (Drafts that lose arguments with files get a nap.)
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW;

  var fileObjs = {};   // key -> object as shipped in the data file
  var fileJSON = {};   // key -> JSON string of the above
  var live = {};       // key -> what the site actually shows (draft or file)
  var dirty = {};      // key -> true when a draft is active
  var listeners = [];
  var KINDS = {};      // key -> 'section' | 'letter' | 'playlist' | 'nav'

  RDW.notices = [];    // things worth telling the user once the UI is up

  function define(kind, key, obj) {
    KINDS[key] = kind;
    fileObjs[key] = obj;
    fileJSON[key] = JSON.stringify(obj);
    var draft = RDW.storage.get('draft:' + key, null);
    if (draft && draft.base === RDW.hash(fileJSON[key]) && draft.data) {
      live[key] = draft.data; dirty[key] = true;
    } else {
      if (draft) {
        RDW.storage.set('backup:' + key, draft);
        RDW.storage.remove('draft:' + key);
        RDW.notices.push('The data file for "' + key + '" changed, so your old browser draft was parked as a backup (Settings → Content).');
      }
      live[key] = RDW.clone(obj); dirty[key] = false;
    }
  }

  RDW.defineSection = function (obj) { define('section', obj.id, obj); };
  RDW.defineLetter = function (obj) { define('letter', '_letter', obj); };
  RDW.definePlaylist = function (obj) { define('playlist', '_playlist', obj); };
  RDW.defineNav = function (obj) { define('nav', '_nav', obj); };

  function emit(key) { listeners.slice().forEach(function (fn) { try { fn(key); } catch (e) { console.error(e); } }); }

  RDW.store = {
    onChange: function (fn) { listeners.push(fn); },
    get: function (key) { return live[key]; },
    has: function (key) { return live[key] !== undefined; },
    kind: function (key) { return KINDS[key] || 'section'; },
    keys: function () { return Object.keys(live); },
    sectionKeys: function () { return Object.keys(live).filter(function (k) { return KINDS[k] === 'section'; }); },

    /** Give a doc a starting value if no file defined it (e.g. a brand-new custom section). */
    ensure: function (kind, key, obj) { if (live[key] === undefined) { KINDS[key] = kind; live[key] = obj; fileObjs[key] = null; fileJSON[key] = ''; dirty[key] = false; } },

    isDirty: function (key) { return !!dirty[key]; },
    dirtyKeys: function () { return Object.keys(dirty).filter(function (k) { return dirty[k]; }); },

    set: function (key, obj) {
      live[key] = obj;
      var same = fileJSON[key] && JSON.stringify(obj) === fileJSON[key];
      if (same) { dirty[key] = false; RDW.storage.remove('draft:' + key); }
      else {
        dirty[key] = true;
        var ok = RDW.storage.set('draft:' + key, { base: RDW.hash(fileJSON[key] || ''), data: obj, savedAt: Date.now() });
        if (!ok) RDW.toast('Could not save in this browser (storage full or blocked). Download your changes now!');
      }
      emit(key);
    },

    /** mutate('identity', function(doc){ doc.blocks.push(...) }) */
    mutate: function (key, fn) {
      var copy = RDW.clone(live[key]);
      fn(copy);
      RDW.store.set(key, copy);
    },

    reset: function (key) {
      RDW.storage.remove('draft:' + key);
      dirty[key] = false;
      if (fileObjs[key]) live[key] = RDW.clone(fileObjs[key]);
      emit(key);
    },

    resetAll: function () { Object.keys(dirty).forEach(function (k) { if (dirty[k]) RDW.store.reset(k); }); },

    /** Where this doc's file lives in the repo. */
    filePath: function (key) {
      var site = RDW.site || {};
      if (key === '_letter') return site.letterFile || 'data/letter.sealed.js';
      if (key === '_playlist') return site.playlistFile || 'data/playlist.js';
      if (key === '_nav') return site.navFile || 'data/nav.js';
      var s = (site.sections || []).filter(function (x) { return x.id === key; })[0];
      if (s && s.file) return s.file;
      var nav = live._nav;
      var ex = nav && (nav.extra || []).filter(function (x) { return x.id === key; })[0];
      return (ex && ex.file) || 'data/sections/' + key + '.js';
    },

    /** The exact text of a data file for this doc. */
    exportText: function (key) {
      var fn = { section: 'RDW.defineSection', letter: 'RDW.defineLetter', playlist: 'RDW.definePlaylist', nav: 'RDW.defineNav' }[KINDS[key] || 'section'];
      return '// RDWEEB data file: ' + RDW.store.filePath(key) + '\n' +
        '// Edit with the in-site editor (press E) or by hand. Commas are fragile, be gentle.\n' +
        fn + '(' + JSON.stringify(live[key], null, 2) + ');\n';
    },

    downloadFile: function (key) {
      var path = RDW.store.filePath(key);
      RDW.download(path.split('/').pop(), RDW.store.exportText(key), 'text/javascript;charset=utf-8');
    },

    backup: function () {
      var out = { app: 'rdweeb', version: RDW.VERSION, savedAt: new Date().toISOString(), docs: {} };
      Object.keys(live).forEach(function (k) { out.docs[k] = { kind: KINDS[k], data: live[k] }; });
      return out;
    },

    restore: function (obj) {
      if (!obj || obj.app !== 'rdweeb' || !obj.docs) throw new Error('That does not look like an RDWEEB backup file.');
      Object.keys(obj.docs).forEach(function (k) {
        var d = obj.docs[k]; if (!d || !d.data) return;
        if (live[k] === undefined) { KINDS[k] = d.kind || 'section'; fileObjs[k] = null; fileJSON[k] = ''; }
        RDW.store.set(k, d.data);
      });
    },

    /** Drafts whose data file does not exist (yet), like brand-new custom sections. Call once after loading. */
    loadOrphans: function () {
      RDW.storage.keys('draft:').forEach(function (k) {
        var key = k.slice(6);
        if (live[key] !== undefined) return;
        var d = RDW.storage.get(k, null);
        if (!d || !d.data) return;
        KINDS[key] = key === '_letter' ? 'letter' : key === '_playlist' ? 'playlist' : key === '_nav' ? 'nav' : 'section';
        fileObjs[key] = null; fileJSON[key] = ''; live[key] = d.data; dirty[key] = true;
      });
    },

    hasBackup: function (key) { return !!RDW.storage.get('backup:' + key, null); },
    restoreParked: function (key) {
      var b = RDW.storage.get('backup:' + key, null);
      if (b && b.data) { RDW.store.set(key, b.data); RDW.storage.remove('backup:' + key); }
    },
    parkedKeys: function () { return RDW.storage.keys('backup:').map(function (k) { return k.slice(7); }); }
  };
})();
