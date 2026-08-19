// Refresh the static roster + artifact sets from the community build site, which keeps
// up with the current game. (The jmp.blue API lags and misses the newest units.) The
// site builds its pages from JSON in a public repo, so this reads that JSON instead of
// scraping HTML. A bad read stays contained because the merge never deletes and a human
// reviews the sync PR.
//
// Sources, all from the build repo's default branch:
//   - the file listing: one src/content/<element>/<rarity>/<slug>/metadata.json per
//     character (the Traveler gets one per element), which is where element, rarity and
//     slug come from
//   - src/i18n/en/characters.json: slug -> English display name
//   - that same metadata.json: weapon type, read only for characters we don't have yet
//   - src/data/artifacts/artifact_sets.json + src/i18n/en/artifact-sets.json: set names
//
// Matching is by slug, not name, so our shortened display names ("Raiden", "Childe")
// survive a sync. `id` is the name, and renaming would orphan saved progress. Upstream
// has no region field, so new entries get "—" for a human to fill in during PR review.
// Run: npm run sync:data
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { slugify } from "../src/lib/slug.js";

const REPO = "Genshin-Impact-Helper-Team/genshin-builds";
const BRANCH = "main";
const API_TREE = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
const CDN_LISTING = `https://data.jsdelivr.com/v1/packages/gh/${REPO}@${BRANCH}?structure=flat`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const ROSTER_FILE = "src/data/roster.js";
const TRACKING_FILE = "src/data/tracking.js";
// Upstream content directories name elements in lowercase and the roster capitalizes them,
// so cap() restores the roster's casing for elements here and for weapon names below. This
// list also filters out any content directory that isn't an element.
const ELEMENTS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"];
const WEAPONS = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function getJSON(url, headers = {}) {
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Every path in the repo, each with a leading slash. The GitHub tree includes directory
// entries and the jsDelivr mirror doesn't. Either way the regex below skips every path that
// isn't a metadata.json. The GitHub tree reflects the branch head, but unauthenticated calls
// get 60 requests/hour per IP, so the workflow passes GITHUB_TOKEN to lift the cap on a
// shared runner. The jsDelivr mirror needs no auth, yet it can lag the branch, and a stale
// listing drops new characters without erroring. So GitHub goes first, and a rate-limit
// refusal or a truncated tree falls through to the mirror.
async function listFiles() {
  const headers = { "User-Agent": "teyvat-build-archive-sync" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const { tree, truncated } = await getJSON(API_TREE, headers);
    if (truncated) throw new Error("tree response truncated");
    return tree.map((e) => `/${e.path}`);
  } catch (err) {
    console.warn(`GitHub listing unavailable (${err.message}). Using the jsDelivr mirror`);
    const { files } = await getJSON(CDN_LISTING);
    return files.map((f) => f.name);
  }
}

// One character per src/content/<element>/<rarity>/<slug>/metadata.json in the listing.
// The Traveler lives under every element, so it collapses to the first one seen here and
// main() puts the roster's own element back.
function parseCharacters(paths, names) {
  const re = /^\/src\/content\/([a-z]+)\/(\d)\/([a-z0-9-]+)\/metadata\.json$/;
  const out = [];
  const seen = new Set();
  for (const path of paths) {
    const m = re.exec(path);
    if (!m) continue;
    const [, element, rarity, slug] = m;
    // Filter before claiming the slug. Upstream already keeps non-character files under
    // src/content/site, and a path under a directory like that would otherwise claim the
    // slug and hide the character's real entry.
    if (!ELEMENTS.includes(cap(element))) continue;
    if (Number(rarity) !== 4 && Number(rarity) !== 5) continue;
    if (seen.has(slug)) continue; // Traveler, listed once per element
    seen.add(slug);
    const name = names[slug];
    if (!name) {
      console.warn(`no English name for ${slug}, skipped`);
      continue;
    }
    out.push({ slug, name, element: cap(element), rarity: Number(rarity) });
  }
  return out;
}

// artifact_sets.json lists the sets that exist and the English i18n file names them.
// Iterating the sets means an i18n name with no set behind it never gets read.
function parseSets(sets, names) {
  const out = [];
  for (const slug of Object.keys(sets)) {
    if (names[slug]) out.push(names[slug]);
    else console.warn(`no English name for artifact set ${slug}, skipped`);
  }
  return out;
}

async function main() {
  // --- characters ---
  const [paths, charNames] = await Promise.all([
    listFiles(),
    getJSON(`${RAW_BASE}/src/i18n/en/characters.json`),
  ]);
  const upstream = parseCharacters(paths, charNames);
  // 50 is far below the ~119 upstream carries, so this only trips on a layout change, not
  // on a quiet patch week.
  if (upstream.length < 50) {
    throw new Error(`only ${upstream.length} characters parsed, upstream layout likely changed`);
  }

  const { ROSTER } = await import(new URL("../src/data/roster.js", import.meta.url));
  // Two roster rows sharing a slug would collapse into one entry of the map below, and the
  // loser would vanish from the rewritten file without showing up in `kept`. Check here,
  // where the drop would happen, rather than after the merge, where it is already invisible.
  const dupSlug = ROSTER.map((c) => c.slug).find((s, i, a) => a.indexOf(s) !== i);
  if (dupSlug !== undefined) throw new Error(`two roster rows share the slug "${dupSlug}"`);
  // Existing tuples keyed by slug. The display name (0), weapon (2) and region (4) are
  // hand-maintained, so keep them and refresh only element (1) and rarity (3).
  const existing = new Map(
    ROSTER.map((c) => [c.slug, [c.name, c.element, c.weapon, c.rarity, c.region, c.slug]])
  );

  const result = new Map();
  const added = [];
  for (const c of upstream) {
    const e = existing.get(c.slug);
    if (e) {
      // The Traveler keeps its element too, since upstream lists one per element.
      const element = c.slug === "traveler" ? e[1] : c.element;
      result.set(c.slug, [e[0], element, e[2], c.rarity, e[4], c.slug]);
      continue;
    }
    // New character. Fetch its metadata for the weapon type. Upstream has no region, so
    // it lands as "—".
    let weapon = null;
    try {
      const meta = await getJSON(
        `${RAW_BASE}/src/content/${c.element.toLowerCase()}/${c.rarity}/${c.slug}/metadata.json`
      );
      const w = cap(String(meta.weapon || ""));
      // A weapon we don't recognize means the field moved or changed shape upstream, which
      // would otherwise look the same as one flaky request: every new character guessed.
      if (WEAPONS.includes(w)) weapon = w;
      else console.warn(`unexpected weapon ${JSON.stringify(meta.weapon)} for ${c.slug}`);
    } catch (err) {
      console.warn(`could not fetch metadata for ${c.slug}: ${err.message}`);
    }
    result.set(c.slug, [c.name, c.element, weapon || "Sword", c.rarity, "—", c.slug]);
    added.push(
      weapon
        ? `${c.name} (${c.element} ${c.rarity}★, ${weapon}, region "—", set the region)`
        : `${c.name} (${c.element} ${c.rarity}★, Sword GUESSED, region "—", set both)`
    );
  }

  // Keep characters the build site doesn't list.
  const kept = [];
  for (const [slug, e] of existing) {
    if (!result.has(slug)) {
      result.set(slug, e);
      kept.push(e);
    }
  }
  // A row only carries an explicit slug in order to point at an upstream entry, so if such
  // a row goes unmatched, upstream renamed that slug or dropped the character. On a rename
  // upstream arrives as a second row under its own name, and since ours is shorter or just
  // different ("Childe" for "Tartaglia"), the two names differ and the duplicate-name check
  // below never sees it. Both rows would be written, one of them linking to a 404 and
  // showing no build-source portrait. Stop and let a human repoint the slug, or drop it if
  // the character really did leave upstream. This is not a complete net: a row without an
  // explicit slug that upstream renames in both slug and display name lands the same way,
  // with the old row in `kept` and the new one added under its new name.
  const stale = kept.find((e) => e[5] !== slugify(e[0]));
  if (stale !== undefined) {
    throw new Error(`roster slug "${stale[5]}" (${stale[0]}) no longer exists upstream`);
  }

  const all = [...result.values()];
  // Display names have to stay unique too. The name is the character's `id` in saved data,
  // and `byId` in useTracker is an Object.fromEntries, so of two rows sharing a name the
  // later one wins and the other disappears from the app. It happens two ways. Upstream
  // renames a slug, so the old row survives the merge above while the new one arrives under
  // the same name, or a new upstream character's name matches one of the nine we rename by
  // hand. Let a human pick before anything is written.
  const dupName = all.map((t) => t[0]).find((n, i, a) => a.indexOf(n) !== i);
  if (dupName !== undefined) {
    throw new Error(`two rows share the display name "${dupName}" after merge`);
  }
  // Write the slug out only when it differs from the slugified display name.
  const line = (t) => {
    const fields = [
      JSON.stringify(t[0]),
      JSON.stringify(t[1]),
      JSON.stringify(t[2]),
      String(t[3]),
      JSON.stringify(t[4]),
    ];
    if (t[5] !== slugify(t[0])) fields.push(JSON.stringify(t[5]));
    return `  [${fields.join(", ")}],`;
  };
  const fives = all.filter((t) => t[3] === 5).sort((a, b) => a[0].localeCompare(b[0]));
  const fours = all.filter((t) => t[3] === 4).sort((a, b) => a[0].localeCompare(b[0]));
  const rawBody = ["  // 5-star", ...fives.map(line), "  // 4-star", ...fours.map(line)].join("\n");

  let rsrc = await readFile(ROSTER_FILE, "utf8");
  rsrc = rsrc.replace(/const RAW = \[[\s\S]*?\n\];/, `const RAW = [\n${rawBody}\n];`);

  // --- artifact sets ---
  const [setData, setNames] = await Promise.all([
    getJSON(`${RAW_BASE}/src/data/artifacts/artifact_sets.json`),
    getJSON(`${RAW_BASE}/src/i18n/en/artifact-sets.json`),
  ]);
  const upstreamSets = parseSets(setData, setNames);
  if (upstreamSets.length < 30) {
    throw new Error(`only ${upstreamSets.length} sets parsed, upstream layout likely changed`);
  }

  const { ARTIFACT_SETS } = await import(new URL("../src/data/tracking.js", import.meta.url));
  const setMap = new Map(ARTIFACT_SETS.map((s) => [s.toLowerCase(), s]));
  const addedSets = [];
  for (const s of upstreamSets) {
    const k = s.toLowerCase();
    if (!setMap.has(k)) {
      setMap.set(k, s);
      addedSets.push(s);
    }
  }
  const allSets = [...setMap.values()].sort((a, b) => a.localeCompare(b));
  const setsBody = allSets.map((s) => `  ${JSON.stringify(s)},`).join("\n");

  let tsrc = await readFile(TRACKING_FILE, "utf8");
  tsrc = tsrc.replace(
    /export const ARTIFACT_SETS = \[[\s\S]*?\n\];/,
    `export const ARTIFACT_SETS = [\n${setsBody}\n];`
  );

  // --- write (only after everything fetched) + format ---
  await writeFile(ROSTER_FILE, rsrc);
  await writeFile(TRACKING_FILE, tsrc);
  await promisify(execFile)("npx", ["prettier", "--write", ROSTER_FILE, TRACKING_FILE]);

  console.log(`characters: +${added.length}`);
  added.forEach((a) => console.log(`  new: ${a}`));
  console.log(`sets: +${addedSets.length}${addedSets.length ? ` (${addedSets.join(", ")})` : ""}`);
  const keptNames = kept.map((e) => e[0]);
  console.log(`kept ${kept.length} not listed upstream: ${keptNames.join(", ") || "none"}`);
}

main().catch((e) => {
  console.error(`sync failed: ${e.message}`);
  process.exit(1);
});
