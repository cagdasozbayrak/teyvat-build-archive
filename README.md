# Teyvat Build Archive

A browser-based Genshin Impact build tracker. Record talent levels and targets, artifact
status and sets, reshape plans, and current and target stats for each character.

## Using it

The app runs in your browser without an account or installation. Select **Add** and choose
the characters you want to track.

Each built-in character links to a community build guide from its detail view.

The app saves data for the current browser and site. It does not sync across devices or
support exports. Clearing the site's browser data deletes your tracking data.

## Run locally

Install [Node.js](https://nodejs.org) 18 or newer. Node.js includes `npm`.

```bash
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

To build and preview the production version:

```bash
npm run build     # write the production build to dist/
npm run preview   # serve the production build locally
```

Deploy the files in `dist/` to a static hosting service.

## Project structure

Application code is under `src/`. The `data/` directory contains game data, `lib/`
contains storage and progress logic, `hooks/` contains React hooks, and `components/`
contains UI components. `App.jsx` assembles the application. Global styles are in
`src/index.css`, and component styles are in `src/theme.css`.

Run `npm run sync:data` to refresh the roster and artifact sets. Other game-data changes
belong under `src/data/`.

## Data and limitations

- Character portraits load from Genshin Builds through jsDelivr, then from the Genshin
  Fandom wiki, and finally from genshin.jmp.blue. If every source fails, the app shows the
  character's initial. You can set a portrait URL in the character's detail view.
- Portraits and element icons require an internet connection.
- Genshin does not provide a public account-inventory API. You must enter talents,
  artifacts, and stats manually.
