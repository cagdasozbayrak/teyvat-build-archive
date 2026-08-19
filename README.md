# Teyvat Build Archive

A Genshin Impact character build tracker — track talents (level + target), artifacts
(complete / upgrade needed, set name, reshape flag), and build stats (current vs target)
for every character you're building.

## Using it

The app runs entirely in your browser — no account, no install. Open the hosted link,
click **Add**, pick your characters, and track their talents, artifacts, and stats.

Each character's detail view links out to a community build guide.

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
Styles live in `src/theme.css`. Each module carries notes on its own conventions;
common tasks (add a character, artifact set, or stat) are one-line data edits under
`src/data/`.

## Notes

- **Saving:** on any standalone build (local or hosted), your data is stored in the
  browser via `localStorage`, so it persists between sessions on the same browser and
  device. There is no cross-device sync; clearing site data resets it.
- **Portraits:** character art loads at runtime from the community Genshin Builds site,
  falling back to the Genshin Fandom wiki and then the genshin.jmp.blue API. Nothing is
  bundled. If none resolve, for example on a brand-new or custom character,
  you'll see the element crest instead, and you can paste any image URL in that character's
  detail view to override it. Portraits need an internet connection.
- **No game import:** Genshin has no public API for your account inventory, so talents,
  artifacts, and stats are tracked manually.
