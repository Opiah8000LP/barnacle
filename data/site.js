// ============================================================================
// data/site.js — the master switchboard. Names, sections, and file locations.
// Edit with care (it's JavaScript!) but nothing in here is scary.
// ============================================================================
window.RDW = window.RDW || {};
RDW.site = {
  name: "RDWEEB",
  alias: "DWEEB",

  // Set to false before you publish if you don't want the pencil (edit mode) button to exist.
  // (Visitors can only ever change THEIR OWN browser's copy, never your files. Still, tidy is nice.)
  allowEditing: true,

  // The sections, in order. To reorder: move a line. To hide one: use "Manage sections" in edit mode.
  //   id     → also the name of its icon file (icons/<id>.svg) and its images folder (images/<id>/)
  //   glyph  → 2 letters shown in the orb if there is no icon file yet
  //   layout → "dashboard" | "years" | "blocks" (normal)
  sections: [
    { id: "home",        title: "Dashboard",              glyph: "HM", layout: "dashboard", icon: "icons/home.svg",        file: "data/sections/home.js" },
    { id: "identity",    title: "Identity & Profile",     glyph: "ID", layout: "blocks",    icon: "icons/identity.svg",    file: "data/sections/identity.js" },
    { id: "personality", title: "Personality & Character", glyph: "PC", layout: "blocks",   icon: "icons/personality.svg", file: "data/sections/personality.js" },
    { id: "worldview",   title: "Beliefs & Worldview",    glyph: "BW", layout: "blocks",    icon: "icons/worldview.svg",   file: "data/sections/worldview.js" },
    { id: "interests",   title: "Interests & Obsessions", glyph: "IO", layout: "blocks",    icon: "icons/interests.svg",   file: "data/sections/interests.js" },
    { id: "creative",    title: "Creative Identity",      glyph: "CI", layout: "blocks",    icon: "icons/creative.svg",    file: "data/sections/creative.js" },
    { id: "growth",      title: "Self-Reflection",        glyph: "SR", layout: "blocks",    icon: "icons/growth.svg",      file: "data/sections/growth.js" },
    { id: "social",      title: "Social Identity",        glyph: "SI", layout: "blocks",    icon: "icons/social.svg",      file: "data/sections/social.js" },
    { id: "future",      title: "Future & Ambitions",     glyph: "FA", layout: "blocks",    icon: "icons/future.svg",      file: "data/sections/future.js" },
    { id: "years",       title: "Life Archive",           glyph: "YR", layout: "years",     icon: "icons/years.svg",       file: "data/sections/years.js" },
    { id: "facts",       title: "Random Facts",           glyph: "RF", layout: "blocks",    icon: "icons/facts.svg",       file: "data/sections/facts.js" }
  ],

  // Which six sections sit on the faces of the 3D cube on the dashboard.
  hero: { cubeFaces: ["identity", "personality", "creative", "social", "future", "years"] },

  // Other data files
  playlistFile: "data/playlist.js",
  letterFile: "data/letter.sealed.js",
  navFile: "data/nav.js",

  // Optional interface sounds. There are NONE included. Drop files in /sfx and keep or change these names.
  // Any file that doesn't exist is simply skipped (silence is fine).
  sfx: {
    click: "sfx/click.mp3",
    hover: "sfx/hover.mp3",
    open:  "sfx/open.mp3",
    close: "sfx/close.mp3",
    enter: "sfx/enter.mp3"
  },

  // Optional background photos (shown in greyscale automatically so the site stays monochrome).
  // Leave "" for a plain background. Example: light: "backgrounds/bg-light.jpg"
  backgrounds: { light: "", dark: "" }
};
