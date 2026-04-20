# Color Listener

Upload an image. Click or drag to hear its colors.

Color Listener is an interactive web app that converts the colors in any image into sound through real-time audio synthesis. Click a pixel to hear its hue, drag to play a chord from a region, or scan across the image like a musical score.

> 📸 **[Add a screenshot of the main UI here]** — the canvas with an image loaded and the controls panel visible. This is the single most useful visual for a first-time visitor.

## Try it

**Hosted version (recommended):** https://donjguido.github.io/color-listener/

No install, no build, no terminal. Open the link in any modern browser (Chrome, Edge, Firefox, Safari) and start playing. Every push to `main` automatically redeploys the site via the workflow in `.github/workflows/deploy.yml`.

> 🎞️ **[Add a short GIF or video here]** — 5–10 seconds of someone uploading an image and clicking around to hear notes. Demonstrates the core experience faster than any paragraph of text.

## Features

- **Three interaction modes** — Click individual pixels, select a region for chord playback, or auto-scan left to right
- **26 instruments** — Basic waveforms (sine, triangle, sawtooth, square), strings, woodwinds, brass, and percussion, each with realistic harmonic partials and ADSR envelopes
- **Color → Instrument mapping** — Assign a different instrument to each hue family (reds, oranges, yellows, greens, cyans, blues, purples, magentas, plus a neutral bucket for grays/black/white). A region with multiple colors plays back as an ensemble — e.g., reds on trumpet, blues on cello
- **Frequency mapping** — Map color to pitch by hue, brightness, or full HSL
- **Polyphonic chords** — Region and scan modes cluster colors by hue and play up to 6 simultaneous voices
- **Snap to Scale** — Lock output frequencies to the chromatic scale
- **Multiple themes** — Midnight, Sunset, Forest, Synthwave, Paper, and Mono
- **Draggable panels** — Hide, reorder, or restore any control panel; layout persists across sessions
- **Waveform visualizer** — Real-time display of the audio output
- **Touch support** — Works on mobile and tablet

> 🎼 **[Add a screenshot of the Color → Instrument panel here]** — the panel expanded with the toggle on and a few families assigned to different instruments. This feature is novel enough to deserve its own visual.

> 🎨 **[Add a diagram here]** — a labeled illustration showing how a pixel's hue, saturation, and lightness map to pitch, volume, and timbre. This is the conceptual core of the app and hard to grasp without a picture.

> 🖼️ **[Add side-by-side examples here]** — 2–3 images (e.g., a sunset, a Mondrian, a photo of trees) next to a short audio clip of what each one sounds like. Helps people see *why* this is interesting.

## Running it locally

You only need this if you want to modify the code. The app is pure static HTML/JS/CSS — **no build step, no dependencies**.

**Easiest:** double-click `index.html` to open it in your browser. Done.

**If your browser restricts `file://` access** (some features like file upload may need a server), run any static file server from the project folder:

```bash
# Python (pre-installed on macOS/Linux, available on Windows)
python -m http.server 8000

# or Node (no install)
npx serve .
```

Then visit `http://localhost:8000`.

## Hosting your own copy on GitHub Pages

The repo is a fully static site — no build step, no server code, no dependencies. It works on GitHub Pages out of the box.

**To publish your own copy:**

1. **Fork this repo** (or clone and push to a new repo of your own).
2. In your fork, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push any commit to `main`. The included workflow (`.github/workflows/deploy.yml`) automatically builds and deploys the site.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/` within a minute or two. The URL is also shown in the Actions run output.

**Why this works without configuration:**

- All asset paths in `index.html` are relative (`styles.css`, `app.js`, etc.), so the site works at any base path — including the `/<repo-name>/` subpath GitHub Pages uses for project sites.
- There are no absolute `/` references, no `localhost` URLs, no `file://` assumptions.
- User preferences (selected theme, panel layout) are stored in `localStorage`, which is scoped per-origin and works natively on `github.io`.
- Dev-only files (`node_modules/`, `.claude/`, etc.) are gitignored, so the Pages artifact stays small.

**Customizing before you publish:** edit the files locally, commit, and push. Every push to `main` redeploys automatically. To preview changes before pushing, run `python -m http.server 8000` (or `npx serve .`) in the project folder and visit `http://localhost:8000`.

**If the site doesn't appear:** check the **Actions** tab on GitHub — the deploy workflow's log will point to any issue (most commonly, Pages not yet enabled in Settings).

## Files

- `index.html` — markup and layout
- `styles.css` — styling
- `app.js` — UI wiring and state
- `canvas.js` — image rendering and pixel sampling
- `audio.js` — color-to-sound mapping and playback
- `panels.js` — hide / re-order / restore side panels
- `.github/workflows/deploy.yml` — GitHub Pages deployment

## Adding your own side panel

The right-hand controls column is built from independent `<section class="panel-section">` blocks. Users can hide, reorder, and restore any panel via the **Panels** menu at the top of the column. Order and visibility are persisted in `localStorage` under the key `colorListener.panelState.v1`.

To add a new panel to your fork:

1. **Add the markup** in `index.html`, inside `<aside class="controls-panel" id="controlsPanel">`. Give it a unique `data-panel-id` (kebab-case, stable — this key is what gets saved to `localStorage`):

   ```html
   <section class="panel-section" data-panel-id="my-panel">
     <h2>My Panel</h2>
     <!-- your controls here -->
   </section>
   ```

2. **Wire up any logic** in `app.js` (or a new script included after `panels.js`).

3. **That's it.** `panels.js` auto-discovers every `.panel-section[data-panel-id]` on load — it adds the × close button, the drag handle, and the menu entry for you. No registration step.

A few things to know:

- **Stable IDs matter.** If you rename a `data-panel-id`, existing users' saved layouts will treat it as a new panel and drop the old entry on next load. Unknown IDs in saved state are ignored gracefully; new IDs are appended to the end of the order.
- **Headings are the drag handle.** Drag starts only when the user grabs the `<h2>`, so sliders and buttons inside panels keep working normally.
- **Menu items are alphabetized** by the `<h2>` text. The panel order in the page reflects the user's drag order, independent of the menu order.
- **To reset during development,** clear the `colorListener.panelState.v1` key from your browser's localStorage, or click **Reset layout** in the Panels menu.

## Tech Stack

- Vanilla JavaScript (no framework, no bundler)
- Web Audio API (synthesis, envelopes, filters, vibrato)
- HTML5 Canvas (image rendering and interaction)

## License

ISC
