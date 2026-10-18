# RDWEEB — personal bio site

A floating, 3D, black-and-white bio site. Plain HTML + CSS + JavaScript. **No build step, no frameworks, no accounts.**
Everything you write lives in small text files inside `data/`, or is typed straight into the site with the built-in editor.

> Fresh out of the box the site is intentionally empty: all labels, sections, charts and forms exist, but there are
> no essays, no invented facts about you, no pictures and no songs. The blanks are yours. Fill them at your own pace
> (or never; the empty-state jokes are doing fine).

---

## 1. See it on your computer

Browsers won't load the data files if you double-click `index.html` in some cases, so run a tiny local server:

```bash
cd rdweeb-site
python3 -m http.server 8000      # then open http://localhost:8000
```
(Or use VS Code's "Live Server" extension. Same thing, fewer typing.)

## 2. Put it on GitHub Pages (free)

1. Create a repository, upload everything in this folder (the `.nojekyll` file included).
2. Repo → **Settings → Pages → Deploy from a branch → `main` / root → Save.**
3. Wait a minute. Your site lives at `https://<you>.github.io/<repo>/`.

---

## 3. The easy way to add content: Edit mode

Press **E** (or the pencil button). Every block now gets **Edit / ↑ / ↓ / Archive / Delete** buttons.
Panel header gets **+ Paragraph** (add as many paragraphs as you like to *any* tab) and **+ Block**.

* **Edit** a block → a form appears. Paragraph blocks have one box per paragraph. Lists take one item per line.
* **Reorder** with the arrows. **Archive** hides something without deleting it (shows dimmed in edit mode).
* **+ Block** → pick a type: paragraphs, labelled fields, list, tags, cards, image gallery, audio clips, timeline, monthly journal, Q&A, number tiles, colour palette, quiz.
* **Manage sections** (the ☰ button in edit mode) → rename, reorder, hide, or add whole new tabs.
* **Life Archive** → "+ Year" creates a ready-made page for any year.
* **Dashboard** → "Edit numbers" changes the metrics; the charts redraw instantly.

### IMPORTANT: how saving works (static hosting has no server)
GitHub Pages can only *serve* files; it cannot *receive* your edits. So:

1. Edits are saved **as a draft in your own browser** (so you can close the tab safely).
2. When you're happy: press **Download changes** in the bar at the bottom (or Settings → *Content, backup & files*).
3. Each changed file downloads with its real name (e.g. `identity.js`). Drop it into the matching folder (path is shown next to each one), **commit, push**. Done. Visitors now see it.
4. Visitors can also open edit mode, but they can only change *their own browser's* copy. Your files are safe. If you'd rather hide the pencil entirely, set `allowEditing: false` in `data/site.js`.

If you change a data file by hand *after* making browser edits, the old browser draft is parked as a backup (never silently overwritten). Settings → Content → "Parked drafts".

**Backup:** Settings → Content → *Save full backup (.json)*. Do this now and then. Browsers sometimes eat their storage; it's rude but true.

---

## 4. The secret censor trick

Type `<Secret&4>` anywhere in text and it becomes a solid black bar four characters wide. `<Secret&12>` → twelve wide.
Only the **number** is stored. The real word was never typed, so it can't be dug out of the page source, the JSON, or the search index.
(Don't type the real word anywhere, not even "temporarily". That's the one rule.)

Also supported in text: `**bold**`, `*italic*`, `[link text](https://example.com)`.

---

## 5. Folder map

```
index.html            the one page
css/                  look & feel (tokens.css = all colours, only black/white/grey)
js/core/              brains: store, settings, router, search, nav, sound effects
js/ui/                blocks, forms, editor, charts, dashboard, player, letter, dialogs, stage
js/loader.js          the loading screen (loads every script + asset)
data/site.js          section list, name, optional sounds/backgrounds
data/sections/*.js    ONE FILE PER SECTION — your actual content
data/playlist.js      music player playlist
data/letter.sealed.js the encrypted future letter (scrambled text only)
data/nav.js           renamed/hidden/custom sections
icons/                tab icons          images/<section>/   pictures
music/                .mp3 files         covers/             track covers
sfx/ backgrounds/ fonts/                 all optional
vendor/tlock.bundle.js  time-lock encryption library (for the letter)
```

## 6. File names (very important, computers are picky)

Use **lowercase, no spaces, dashes instead**, and keep the extension.

| What | Where | Example name |
|---|---|---|
| Tab icons | `icons/` | `home.svg` `identity.svg` `personality.svg` `worldview.svg` `interests.svg` `creative.svg` `growth.svg` `social.svg` `future.svg` `years.svg` `facts.svg` (custom tabs: `<their-id>.svg`) |
| Music | `music/` | `01-song-name.mp3` |
| Track covers | `covers/` | `01-song-name.jpg` |
| Section pictures | `images/<section>/` | `images/creative/cat-drawing-2024.png` |
| Year page pictures | `images/years/<year>/` | `images/years/2026/trip-01.jpg` |
| Screenshots | any images folder | `minecraft-castle-01.png` |
| Optional sounds | `sfx/` | `click.mp3` `hover.mp3` `open.mp3` `close.mp3` `enter.mp3` |
| Optional background | `backgrounds/` | `bg-light.jpg` (then set in `data/site.js`) |

In the editor you only ever type the **file name** (`cat-drawing-2024.png`); the site already knows which folder to look in. Galleries have an **"Add many at once"** box: paste one file name per line.
Icons: SVG with one solid colour works best (the site inverts it on hover). No icon yet? The orb shows two letters instead.

**Music:** list tracks in the player (press **E** → *Edit playlist*) or in `data/playlist.js`. Order = play order. Name them `01-…`, `02-…` to stay sane. The player remembers track, position, volume, shuffle and repeat between visits.

**Why "Tap to enter"?** Browsers refuse to play sound until you touch the page. The loading screen loads everything first, then the tap both opens the site and starts the music.

---

## 7. The letter to your future self (genuinely private)

* **Where:** Future & Ambitions → "A letter to my future self" (turn on edit mode → *Write & seal a letter*).
* **How it works:** your browser encrypts the letter with **timelock encryption** ([tlock](https://github.com/drand/tlock-js) on the public [drand](https://drand.love) "quicknet" randomness beacon). The decryption key does not exist until the beacon publishes the round for your chosen unlock time. Before then **nobody can decrypt it, not you, not me, not GitHub.** At unlock time, anyone's browser can fetch the key and read it.
* **What goes in GitHub:** only the scrambled text in `data/letter.sealed.js`. The plain words are never in the HTML, JS, JSON or search index. The search box doesn't know the letter's contents either.
* **Steps:** write → pick date → *Seal it* → download the sealed file → replace `data/letter.sealed.js` → commit.
* **Limits (honesty section):**
  * Needs an internet connection to seal and to open (it talks to drand).
  * It's a *time lock*, not a *password*: once the date passes, **anyone** who visits can open it. Don't put things in it you'd never want public after that date.
  * You can't edit a sealed letter, only replace it with a new one. Once sealed, the old words are gone from your screen (keep your own copy if you care!).
  * Depends on drand staying online. It's run by a big consortium and has been for years, but nothing on the internet is forever.
  * The unlock time is rounded to drand's 3-second beacon rounds.

---

## 8. Features checklist (all real, all wired up)

Floating 3D orbs & menu, cube shortcut on the dashboard, pointer parallax · global search with highlighting, auto-navigation and arrow-key results · mobile dock, contents sheet, swipe between sections · light/dark/auto · reduced-motion, high-contrast, text size, line spacing, easy-read font, chart hatch patterns, 3D-tilt level · keyboard shortcuts (press `?`) · lightbox with arrows, zoom, swipe · music player with playlist, shuffle, repeat, volume, mute, media keys · five live SVG charts with keyboard support and table versions · quiz with scoring tiers · monthly journal · year pages · backup & restore.

## 9. Things static hosting can't do

* **No real saving from the site itself** → hence the Download → commit flow above.
* **No private data.** Anything in your repo is public. Use `<Secret&N>` for names and the time-lock for the letter. Don't commit things you want hidden.
* **Per-device settings.** Theme, volume, drafts live in each visitor's browser (localStorage), not on a server.
* **Sound needs a tap** (browser rule, see above).

## 10. If something breaks

* Blank/stuck loading screen → it names the file it couldn't load. Usually a typo or missing comma in a data file you edited by hand. (Safer: use the in-site editor!)
* Edited a file but nothing changed → you may have an older browser draft. Settings → Content → *Discard*.
* Changed a data file's block `id`s? Search links to old ids simply scroll to the top of the section. No harm.

Made with love, caffeine, and a regrettable number of semicolons. Go forth, Dweeb.
