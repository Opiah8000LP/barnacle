/* ==========================================================================
   dialog.js — modal dialogs built on <dialog>, so focus trapping, Escape and
   focus-return come free from the browser. Free is my favourite price.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW; var h = RDW.h;

  /**
   * open({ title, body: Node, actions: [{label, primary, danger, keepOpen, onClick(close)}], size:'wide'|'narrow', onClose })
   * returns { close(), el }
   */
  function open(opts) {
    var dlg = h('dialog', { class: 'dlg' + (opts.size ? ' dlg--' + opts.size : ''), 'aria-labelledby': 'dlg-title-' + (opts.id || 'x') });
    var closed = false;
    function close(result) {
      if (closed) return; closed = true;
      RDW.sfx && RDW.sfx.play('close');
      if (dlg.open) dlg.close();
      dlg.remove();
      if (opts.onClose) opts.onClose(result);
    }
    var head = h('header', { class: 'dlg-head' },
      h('h2', { id: 'dlg-title-' + (opts.id || 'x'), class: 'dlg-title' }, opts.title || ''),
      h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Close dialog', onClick: function () { close('x'); } },
        h('span', { 'aria-hidden': 'true' }, '✕')));
    var body = h('div', { class: 'dlg-body' }, opts.body);
    var foot = null;
    if (opts.actions && opts.actions.length) {
      foot = h('footer', { class: 'dlg-foot' }, opts.actions.map(function (a) {
        return h('button', {
          type: 'button', class: 'btn' + (a.primary ? ' btn--primary' : '') + (a.danger ? ' btn--danger' : ''),
          onClick: function (ev) {
            var r = a.onClick ? a.onClick(close, ev) : undefined;
            if (!a.keepOpen && r !== false) close(a.label);
          }
        }, a.label);
      }));
    }
    dlg.appendChild(head); dlg.appendChild(body); if (foot) dlg.appendChild(foot);
    dlg.addEventListener('cancel', function (ev) { ev.preventDefault(); close('esc'); });
    dlg.addEventListener('mousedown', function (ev) { if (ev.target === dlg) close('backdrop'); });
    document.body.appendChild(dlg);
    RDW.sfx && RDW.sfx.play('open');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    var first = dlg.querySelector('[autofocus], input:not([type=hidden]), textarea, select');
    if (first && !opts.noAutofocus) first.focus({ preventScroll: true });
    return { close: close, el: dlg, body: body };
  }

  function confirmBox(message, okLabel, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var answered = false;
      open({
        title: opts.title || 'Are you sure?', size: 'narrow', id: 'confirm',
        body: h('p', null, message),
        actions: [
          { label: 'Never mind', onClick: function () { answered = true; resolve(false); } },
          { label: okLabel || 'Yes', primary: true, danger: !!opts.danger, onClick: function () { answered = true; resolve(true); } }
        ],
        onClose: function () { if (!answered) resolve(false); }
      });
    });
  }

  function promptBox(message, initial, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var input = h('input', { type: opts.type || 'text', value: initial || '', placeholder: opts.placeholder || '', autofocus: true, 'aria-label': message });
      var answered = false;
      var dlg = open({
        title: opts.title || message, size: 'narrow', id: 'prompt',
        body: h('form', { onSubmit: function (ev) { ev.preventDefault(); answered = true; resolve(input.value); dlg.close('ok'); } },
          opts.title ? h('p', null, message) : null,
          h('div', { class: 'field' }, input, opts.help ? h('p', { class: 'help' }, opts.help) : null),
          h('button', { type: 'submit', class: 'sr-only' }, 'OK')),
        actions: [
          { label: 'Cancel', onClick: function () { answered = true; resolve(null); } },
          { label: opts.okLabel || 'OK', primary: true, keepOpen: true, onClick: function () { answered = true; resolve(input.value); dlg.close('ok'); } }
        ],
        onClose: function () { if (!answered) resolve(null); }
      });
    });
  }

  RDW.dialog = { open: open, confirm: confirmBox, prompt: promptBox };
})();
