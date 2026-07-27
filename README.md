# Teyvat Build Archive

A Genshin Impact character build tracker — track talents (level + target), artifacts
(complete / upgrade needed, set name, reshape flag), and build stats (current vs target)
for every character you're building.

## Using it

The app runs entirely in your browser — no account, no install. Open the hosted link,
click **Add**, pick your characters, and track their talents, artifacts, and stats.

Your data is saved **in this browser on this device only**. There's no cross-device sync,
and clearing the browser's site data will wipe your tracking (no export yet).

## Requirements

- [Node.js](https://nodejs.org) 18 or newer (includes `npm`).

## Run it

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).

## Build a static version

```bash
npm run build     # outputs to dist/
npm run preview   # serve the built version locally
```

The contents of `dist/` are plain static files you can host anywhere.

## Project structure

Source is organized under `src/` into `data/` (static game data), `lib/` (storage +
progress logic), `hooks/` (state), and `components/` (UI), composed by `App.jsx`.
Styles live in `src/theme.css`. See the module notes for architecture, conventions, and
how to do common tasks (add a character, artifact set, or stat).

## Notes

- **Saving:** when run locally, your data is stored in the browser via `localStorage`,
  so it persists between sessions on the same browser. Clearing site data resets it.
- **Portraits:** character art is loaded by name from the Genshin Fandom wiki at runtime
  (nothing is bundled). If a portrait doesn't resolve — e.g. a brand-new or custom
  character — you'll see the element crest instead, and you can paste any image URL in
  that character's detail view to override it. Portraits require an internet connection.
- **No game import:** Genshin has no public API for your account inventory, so talents,
  artifacts, and stats are tracked manually.
