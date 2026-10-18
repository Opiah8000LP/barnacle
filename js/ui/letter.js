/* ==========================================================================
   letter.js — the letter to your future self.

   HOW IT STAYS PRIVATE: the letter is encrypted in your browser with
   "timelock" encryption (drand / tlock). The encryption key does not exist
   until a public randomness beacon publishes a specific round at the unlock
   time. Before that, nobody on Earth can decrypt it — including you and me.
   Only the scrambled text is stored in data/letter.sealed.js. The words are
   never in the repo, the HTML, the JSON, or a hidden element.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW; var h = RDW.h;

  function doc() { return RDW.store.get('_letter') || {}; }
  function sealed() { var d = doc(); return d.cipher && d.unlockMs ? d : null; }
  function countdown(ms) {
    var s = Math.max(0, Math.floor((ms - Date.now()) / 1000));
    var d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return (d ? d + 'd ' : '') + String(hh).padStart(2, '0') + 'h ' + String(m).padStart(2, '0') + 'm ' + String(sec).padStart(2, '0') + 's';
  }

  function write() {
    if (!window.RDTimeLock) { RDW.toast('The time-lock library did not load (vendor/tlock.bundle.js).'); return; }
    var ta = h('textarea', { rows: 12, 'aria-label': 'Your letter', placeholder: 'Dear future me…' });
    var when = h('input', { type: 'datetime-local', 'aria-label': 'Unlock date and time' });
    var d = new Date(Date.now() + 365 * 86400000); d.setMinutes(0, 0, 0);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    when.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    var status = h('p', { class: 'help', role: 'status' });
    var body = h('div', null,
      h('p', null, 'Write your letter, pick a date, and seal it. After sealing, ', h('strong', null, 'nobody can read it until that moment'), ' — not even you. It cannot be edited later.'),
      h('div', { class: 'field' }, h('label', null, 'Letter'), ta),
      h('div', { class: 'field' }, h('label', null, 'Unlocks on'), when, h('p', { class: 'help' }, 'Uses your device’s time zone. Needs an internet connection to seal and to open.')),
      status);
    var dlg = RDW.dialog.open({ title: 'Write & seal the letter', size: 'wide', body: body, actions: [
      { label: 'Cancel' },
      { label: 'Seal it', primary: true, keepOpen: true, onClick: function (close, ev) {
        var text = ta.value; var ms = new Date(when.value).getTime();
        if (!text.trim()) { status.textContent = 'The letter is empty. Even "hi" counts.'; return; }
        if (!isFinite(ms) || ms < Date.now() + 60000) { status.textContent = 'Pick a date at least a minute in the future.'; return; }
        var btn = ev.currentTarget; btn.disabled = true; status.textContent = 'Sealing… (talking to the drand network)';
        RDTimeLock.seal(text, ms).then(function (r) {
          ta.value = '';
          RDW.store.set('_letter', { title: doc().title || '', unlockMs: r.unlockMs, round: r.round, cipher: r.cipher, sealedAt: Date.now() });
          RDW.toast('Sealed! Now download the file and put it in the data folder.', 6000);
          close('sealed');
        }).catch(function (e) { btn.disabled = false; status.textContent = 'Could not seal it: ' + (e && e.message ? e.message : e) + '. Are you online?'; });
      } }
    ] });
    return dlg;
  }

  RDW.blocks.register('letter', {
    label: 'Letter to future self', hidden: true,
    empty: function () { return {}; },
    schema: function () { return []; },
    isEmpty: function () { return false; },
    render: function (b, ctx) {
      var host = h('div', { class: 'letter' });
      var d = sealed();
      if (!d) {
        host.appendChild(h('div', { class: 'empty' }, h('p', { class: 'empty-line' }, 'No letter has been sealed yet. The future is still waiting for mail.')));
        if (ctx.editing) host.appendChild(h('button', { type: 'button', class: 'btn', onClick: write }, 'Write & seal a letter'));
        return host;
      }
      var cd = h('p', { class: 'letter-count', 'aria-live': 'off' });
      var status = h('p', { class: 'muted', role: 'status' });
      var paper = h('div', { class: 'letter-paper', hidden: true, tabindex: '-1' });
      var openBtn = h('button', { type: 'button', class: 'btn btn--primary', hidden: true, onClick: unlock }, 'Open the letter');
      host.appendChild(h('p', { class: 'letter-lock' }, h('span', { class: 'letter-icon', 'aria-hidden': 'true' }, '▣'), ' Sealed until ', h('strong', null, new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(d.unlockMs)))));
      host.appendChild(cd); host.appendChild(openBtn); host.appendChild(status); host.appendChild(paper);
      host.appendChild(h('p', { class: 'help muted' }, 'Encrypted on this device with time-lock encryption. The words are not in this website’s files, so nobody can peek early.'));
      if (ctx.editing) {
        host.appendChild(h('div', { class: 'letter-tools' },
          h('button', { type: 'button', class: 'btn btn--small', onClick: function () { RDW.dialog.confirm('Sealing a new letter replaces the current sealed one for good.', 'Replace it', { danger: true }).then(function (ok) { if (ok) write(); }); } }, 'Write a new letter'),
          h('button', { type: 'button', class: 'btn btn--small', onClick: function () { RDW.store.downloadFile('_letter'); } }, 'Download sealed file')));
      }
      function tick() {
        if (!host.isConnected) { clearInterval(iv); return; }
        var open = Date.now() >= d.unlockMs;
        cd.textContent = open ? 'The time has come.' : 'Unlocks in ' + countdown(d.unlockMs);
        openBtn.hidden = !open || !paper.hidden;
      }
      var iv = setInterval(tick, 1000); tick();
      function unlock() {
        if (!window.RDTimeLock) { status.textContent = 'The time-lock library did not load.'; return; }
        openBtn.disabled = true; status.textContent = 'Asking the drand network for the key…';
        RDTimeLock.open(d.cipher).then(function (text) {
          status.textContent = ''; RDW.clear(paper); paper.hidden = false; openBtn.hidden = true;
          RDW.paragraphs(text.split(/\n{2,}/)).forEach(function (p) { paper.appendChild(p); }); paper.focus();
        }).catch(function (e) { openBtn.disabled = false; status.textContent = 'Could not open it yet (' + (e && e.message ? e.message : 'network trouble') + '). Check your connection and try again in a moment.'; });
      }
      return host;
    }
  });

  RDW.letter = { write: write };
})();
