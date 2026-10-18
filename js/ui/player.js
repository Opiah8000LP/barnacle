/* ==========================================================================
   player.js — the persistent music player.
   Lives outside the page panel, so music keeps going while you navigate.
   Remembers track, position, volume, shuffle & repeat between visits.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW; var h = RDW.h;

  var audio = new Audio();
  audio.preload = 'auto';
  var state = Object.assign({ index: 0, time: 0, volume: null, muted: false, shuffle: false, repeat: 'all', wasPlaying: true, collapsed: true }, RDW.storage.get('player', {}));
  var tracks = [];
  var els = {};
  var shuffleOrder = [];
  var failed = {};   // index -> true when the file would not load

  function save() { RDW.storage.set('player', { index: state.index, time: audio.currentTime || state.time, volume: state.volume, muted: state.muted, shuffle: state.shuffle, repeat: state.repeat, wasPlaying: state.wasPlaying, collapsed: state.collapsed }); }
  var saveSoon = RDW.debounce(save, 400);

  function getTracks() {
    var pl = RDW.store.get('_playlist') || { tracks: [] };
    return (pl.tracks || []).filter(function (t) { return t && t.file; }).map(function (t) {
      return Object.assign({}, t, { src: RDW.resolveAsset(t.file, 'music/'), coverSrc: t.cover ? RDW.resolveAsset(t.cover, 'covers/') : '' });
    });
  }

  function fmtTime(s) { if (!isFinite(s)) return '0:00'; s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function volume() { return state.volume === null ? RDW.settings.get('musicVolume') : state.volume; }
  function applyVolume() { audio.volume = RDW.clamp(volume(), 0, 1); audio.muted = !!state.muted; }

  function nextIndex(dir) {
    if (!tracks.length) return 0;
    if (state.shuffle && tracks.length > 1) {
      if (!shuffleOrder.length || shuffleOrder.length !== tracks.length) { shuffleOrder = tracks.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; }); }
      var pos = shuffleOrder.indexOf(state.index);
      return shuffleOrder[(pos + dir + shuffleOrder.length) % shuffleOrder.length];
    }
    return (state.index + dir + tracks.length) % tracks.length;
  }

  function load(i, autoplay, time) {
    if (!tracks.length) return;
    state.index = RDW.clamp(i, 0, tracks.length - 1);
    var t = tracks[state.index];
    audio.src = t.src; audio.load();
    if (time) { var seek = function () { try { audio.currentTime = time; } catch (e) { /* later */ } audio.removeEventListener('loadedmetadata', seek); }; audio.addEventListener('loadedmetadata', seek); }
    renderMeta(); renderList();
    if (autoplay) play();
    updateMediaSession();
    save();
  }

  function play() {
    if (!tracks.length) return Promise.resolve();
    state.wasPlaying = true;
    var p = audio.play();
    if (p && p.catch) p = p.catch(function (err) { if (err && err.name === 'NotAllowedError') { state.wasPlaying = true; RDW.toast('Your browser wants a tap before it plays music. Press play!'); } });
    return p;
  }
  function pause(fromElsewhere) { audio.pause(); if (!fromElsewhere) state.wasPlaying = false; save(); }
  function toggle() { if (audio.paused) play(); else pause(); }
  function step(dir) {
    if (!tracks.length) return;
    var wasPlaying = !audio.paused;
    if (dir < 0 && audio.currentTime > 3) { audio.currentTime = 0; return; }
    load(nextIndex(dir), wasPlaying || state.wasPlaying);
  }

  function updateMediaSession() {
    if (!('mediaSession' in navigator) || !tracks[state.index]) return;
    var t = tracks[state.index];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title || t.file, artist: t.artist || 'RDWEEB', artwork: t.coverSrc ? [{ src: t.coverSrc }] : [] });
      navigator.mediaSession.setActionHandler('play', play); navigator.mediaSession.setActionHandler('pause', function () { pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { step(-1); }); navigator.mediaSession.setActionHandler('nexttrack', function () { step(1); });
    } catch (e) { /* older browser, no biggie */ }
  }

  /* ---- DOM ------------------------------------------------------------------ */
  function icon(name) {
    var paths = {
      play: 'M7 4l13 8-13 8z', pause: 'M6 4h4v16H6zM14 4h4v16h-4z', prev: 'M6 5v14M20 5L9 12l11 7z', next: 'M18 5v14M4 5l11 7-11 7z',
      vol: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6', mute: 'M4 9v6h4l5 4V5L8 9zM16 9l5 6M21 9l-5 6',
      shuffle: 'M3 6h4l10 12h4M3 18h4l3-3.5M14 9.5L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3',
      repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3'
    };
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', paths[name]);
    if (name === 'play' || name === 'pause') p.setAttribute('fill', 'currentColor');
    svg.appendChild(p); return svg;
  }
  function btn(label, ic, fn, extra) {
    var b = h('button', Object.assign({ type: 'button', class: 'iconbtn', 'aria-label': label, title: label, onClick: fn }, extra || {}));
    b.appendChild(icon(ic)); return b;
  }

  function build(host) {
    RDW.clear(host);
    if (!tracks.length) {
      host.appendChild(h('div', { class: 'pl-empty' },
        h('p', { class: 'pl-empty-title' }, 'Music player'),
        h('p', { class: 'muted' }, 'No tracks yet. Put .mp3 files in the music folder and list them in data/playlist.js'),
        document.documentElement.getAttribute('data-editing') === 'true' ? h('button', { type: 'button', class: 'btn btn--small', onClick: editPlaylist }, 'Edit playlist') : null));
      host.classList.add('is-empty'); return;
    }
    host.classList.remove('is-empty');
    els.title = h('span', { class: 'pl-title' }); els.artist = h('span', { class: 'pl-artist muted' });
    els.cover = h('div', { class: 'pl-cover', 'aria-hidden': 'true' });
    els.seek = h('input', { type: 'range', class: 'pl-seek', min: '0', max: '1000', value: '0', 'aria-label': 'Seek', onInput: function () { if (isFinite(audio.duration)) audio.currentTime = audio.duration * els.seek.value / 1000; } });
    els.cur = h('span', { class: 'pl-time' }, '0:00'); els.dur = h('span', { class: 'pl-time' }, '0:00');
    els.playBtn = btn('Play', 'play', toggle);
    els.mute = btn('Mute', 'vol', function () { state.muted = !state.muted; applyVolume(); syncButtons(); save(); }, { 'aria-pressed': 'false' });
    els.vol = h('input', { type: 'range', class: 'pl-vol', min: '0', max: '100', 'aria-label': 'Volume', value: String(Math.round(volume() * 100)),
      onInput: function () { state.volume = els.vol.value / 100; if (state.volume > 0) state.muted = false; RDW.settings.set('musicVolume', state.volume); applyVolume(); syncButtons(); saveSoon(); } });
    els.shuffle = btn('Shuffle', 'shuffle', function () { state.shuffle = !state.shuffle; shuffleOrder = []; syncButtons(); save(); }, { 'aria-pressed': 'false' });
    els.repeat = btn('Repeat: all', 'repeat', function () { state.repeat = { all: 'one', one: 'off', off: 'all' }[state.repeat]; syncButtons(); save(); }, { 'aria-pressed': 'false' });
    els.list = h('ul', { class: 'pl-list', 'aria-label': 'Playlist' });
    els.listWrap = h('div', { class: 'pl-listwrap', id: 'pl-listwrap', hidden: state.collapsed }, els.list,
      document.documentElement.getAttribute('data-editing') === 'true' ? h('button', { type: 'button', class: 'btn btn--small', onClick: editPlaylist }, 'Edit playlist') : null);
    els.toggleList = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Show playlist', 'aria-expanded': String(!state.collapsed), 'aria-controls': 'pl-listwrap', title: 'Playlist',
      onClick: function () { state.collapsed = !state.collapsed; els.listWrap.hidden = state.collapsed; els.toggleList.setAttribute('aria-expanded', String(!state.collapsed)); save(); } }, '≡');
    els.err = h('p', { class: 'pl-err', hidden: true, role: 'status' });

    host.appendChild(h('div', { class: 'pl-top' }, els.cover, h('div', { class: 'pl-meta' }, els.title, els.artist), els.toggleList));
    host.appendChild(h('div', { class: 'pl-seekrow' }, els.cur, els.seek, els.dur));
    host.appendChild(h('div', { class: 'pl-controls' },
      els.shuffle, btn('Previous track', 'prev', function () { step(-1); }), els.playBtn, btn('Next track', 'next', function () { step(1); }), els.repeat, els.mute));
    host.appendChild(h('div', { class: 'pl-volrow' }, h('span', { class: 'sr-only' }, 'Volume'), els.vol));
    host.appendChild(els.err); host.appendChild(els.listWrap);
    renderMeta(); renderList(); syncButtons();
  }

  function renderMeta() {
    if (!els.title || !tracks[state.index]) return;
    var t = tracks[state.index];
    els.title.textContent = t.title || t.file; els.artist.textContent = t.artist || '';
    RDW.clear(els.cover);
    if (t.coverSrc) { var im = h('img', { src: t.coverSrc, alt: '', onError: function () { im.remove(); } }); els.cover.appendChild(im); }
    else els.cover.appendChild(h('span', null, '♪'));
  }
  function renderList() {
    if (!els.list) return;
    RDW.clear(els.list);
    tracks.forEach(function (t, i) {
      els.list.appendChild(h('li', null, h('button', { type: 'button', class: 'pl-item' + (i === state.index ? ' is-current' : '') + (failed[i] ? ' is-failed' : ''), 'aria-current': i === state.index ? 'true' : null,
        onClick: function () { load(i, true); } },
        h('span', { class: 'pl-num' }, String(i + 1).padStart(2, '0')), h('span', { class: 'pl-name' }, t.title || t.file), h('span', { class: 'pl-art muted' }, failed[i] ? 'file not found' : (t.artist || '')))));
    });
  }
  function syncButtons() {
    if (!els.playBtn) return;
    var playing = !audio.paused;
    var p = els.playBtn.firstChild; els.playBtn.replaceChild(icon(playing ? 'pause' : 'play'), p);
    els.playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); els.playBtn.title = playing ? 'Pause' : 'Play';
    var m = els.mute.firstChild; els.mute.replaceChild(icon(state.muted || volume() === 0 ? 'mute' : 'vol'), m);
    els.mute.setAttribute('aria-pressed', String(!!state.muted)); els.mute.setAttribute('aria-label', state.muted ? 'Unmute' : 'Mute');
    els.shuffle.setAttribute('aria-pressed', String(state.shuffle));
    els.repeat.setAttribute('aria-pressed', String(state.repeat !== 'off'));
    els.repeat.setAttribute('aria-label', 'Repeat: ' + state.repeat); els.repeat.title = 'Repeat: ' + state.repeat;
    els.repeat.classList.toggle('is-one', state.repeat === 'one');
    els.vol.value = String(Math.round((state.muted ? 0 : volume()) * 100));
    var host = document.getElementById('player'); if (host) host.classList.toggle('is-playing', playing);
  }

  function editPlaylist() { if (RDW.editor) RDW.editor.editPlaylist(); }

  /* ---- audio events --------------------------------------------------------------- */
  audio.addEventListener('timeupdate', function () {
    if (els.seek && isFinite(audio.duration) && audio.duration > 0 && document.activeElement !== els.seek) els.seek.value = String(Math.round(audio.currentTime / audio.duration * 1000));
    if (els.cur) els.cur.textContent = fmtTime(audio.currentTime);
    saveSoon();
  });
  audio.addEventListener('loadedmetadata', function () { if (els.dur) els.dur.textContent = fmtTime(audio.duration); if (els.err) els.err.hidden = true; failed[state.index] = false; });
  audio.addEventListener('play', function () { syncButtons(); });
  audio.addEventListener('pause', function () { syncButtons(); });
  audio.addEventListener('ended', function () {
    if (state.repeat === 'one') { audio.currentTime = 0; play(); return; }
    var atEnd = !state.shuffle && state.index === tracks.length - 1;
    if (atEnd && state.repeat === 'off') { syncButtons(); return; }
    load(nextIndex(1), true);
  });
  audio.addEventListener('error', function () {
    if (!tracks.length) return;
    failed[state.index] = true; renderList();
    if (els.err) { els.err.hidden = false; els.err.textContent = 'Could not load "' + (tracks[state.index].file) + '". Is it in the music folder, with that exact name?'; }
    // hop to the next playable track, but never loop forever
    var healthy = tracks.some(function (_, i) { return !failed[i]; });
    if (healthy && tracks.length > 1 && state.wasPlaying) { var n = nextIndex(1); if (!failed[n]) { RDW.toast('Skipped a missing file: ' + tracks[state.index].file); load(n, true); } }
  });
  window.addEventListener('pagehide', save);

  RDW.player = {
    audio: audio,
    /** called once at boot: reads playlist, builds UI, restores state */
    init: function () {
      tracks = getTracks();
      var host = document.getElementById('player');
      build(host);
      applyVolume();
      if (tracks.length) {
        state.index = RDW.clamp(state.index, 0, tracks.length - 1);
        load(state.index, false, state.time);
        syncButtons();
      }
    },
    /** called when the playlist is edited */
    reload: function () {
      var wasPlaying = !audio.paused; var cur = tracks[state.index] && tracks[state.index].file;
      tracks = getTracks(); failed = {}; shuffleOrder = [];
      var idx = tracks.map(function (t) { return t.file; }).indexOf(cur);
      build(document.getElementById('player'));
      if (!tracks.length) { audio.pause(); audio.removeAttribute('src'); return; }
      if (idx === -1) load(0, wasPlaying); else { state.index = idx; renderMeta(); renderList(); syncButtons(); }
    },
    /** after the "tap to enter" gesture */
    startFromGate: function () {
      if (!tracks.length) return;
      applyVolume();
      if (RDW.settings.get('autoplay') && state.wasPlaying !== false) play();
    },
    play: play, pause: pause, toggle: toggle, next: function () { step(1); }, prev: function () { step(-1); },
    toggleMute: function () { if (!els.mute) return; state.muted = !state.muted; applyVolume(); syncButtons(); save(); },
    volumeBy: function (d) { if (!els.vol) return; state.volume = RDW.clamp(volume() + d, 0, 1); state.muted = false; RDW.settings.set('musicVolume', state.volume); applyVolume(); syncButtons(); save(); },
    hasTracks: function () { return tracks.length > 0; },
    tracks: function () { return tracks.slice(); },
    setVolumeFromSettings: function (v) { state.volume = v; applyVolume(); if (els.vol) syncButtons(); save(); },
    rebuildUI: function () { build(document.getElementById('player')); }
  };
})();
