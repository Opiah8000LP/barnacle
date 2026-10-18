/* ==========================================================================
   nav.js — the list of sections (order, titles, hidden ones, custom ones).
   Base list comes from data/site.js. data/nav.js (editable in the site) can
   reorder, rename, hide, and add custom sections on top of it.
   ========================================================================== */
(function () {
  'use strict';
  var RDW = window.RDW;

  function navDoc() { return RDW.store.get('_nav') || { order: [], hidden: [], titles: {}, glyphs: {}, extra: [] }; }

  RDW.nav = {
    /** All sections in display order. includeHidden=true is for the manager dialog. */
    list: function (includeHidden) {
      var site = RDW.site || { sections: [] };
      var nav = navDoc();
      var all = site.sections.map(function (s) { return Object.assign({ custom: false }, s); });
      (nav.extra || []).forEach(function (s) { all.push(Object.assign({ custom: true, layout: 'blocks' }, s)); });
      all.forEach(function (s) {
        if (nav.titles && nav.titles[s.id]) s.title = nav.titles[s.id];
        if (nav.glyphs && nav.glyphs[s.id]) s.glyph = nav.glyphs[s.id];
        s.hidden = (nav.hidden || []).indexOf(s.id) !== -1 && s.id !== 'home';
        if (!s.icon) s.icon = 'icons/' + s.id + '.svg';
        if (!s.glyph) s.glyph = s.title.slice(0, 2).toUpperCase();
      });
      var order = nav.order || [];
      all.sort(function (a, b) {
        var ia = order.indexOf(a.id), ib = order.indexOf(b.id);
        if (ia === -1) ia = 1000 + all.indexOf(a);
        if (ib === -1) ib = 1000 + all.indexOf(b);
        return ia - ib;
      });
      // home always leads, it has feelings
      var home = all.filter(function (s) { return s.id === 'home'; })[0];
      if (home) { all.splice(all.indexOf(home), 1); all.unshift(home); }
      return includeHidden ? all : all.filter(function (s) { return !s.hidden; });
    },
    find: function (id) { return RDW.nav.list(true).filter(function (s) { return s.id === id; })[0] || null; },
    mutate: function (fn) {
      var doc = RDW.clone(navDoc());
      doc.order = doc.order || []; doc.hidden = doc.hidden || []; doc.titles = doc.titles || {}; doc.glyphs = doc.glyphs || {}; doc.extra = doc.extra || [];
      fn(doc);
      RDW.store.set('_nav', doc);
    }
  };
})();
