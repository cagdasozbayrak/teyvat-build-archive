// Sync the static roster and artifact sets with Genshin Builds.
//
// Sources on the default branch:
// - repository tree: character elements, rarities, and slugs
// - src/i18n/en/characters.json: English character names
// - character metadata.json files: weapons for new characters
// - src/data/artifacts/artifact_sets.json and src/i18n/en/artifact-sets.json: set names
//
// Match by slug to preserve local display names and saved IDs. The merge never deletes
// local characters. New characters use the region placeholder until PR review.
// Run with `npm run sync:data`.
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
// Upstream uses lowercase element names. Normalize elements and weapons to the roster's
// casing. ELEMENTS also rejects content directories that are not elements.
const ELEMENTS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"];
const WEAPONS = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function getJSON(url, headers = {}) {
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Prefer GitHub because jsDelivr can lag and omit new characters. Reject truncated GitHub
// trees and fall back to jsDelivr on any GitHub error. GITHUB_TOKEN raises the API limit on
// shared CI runners. Both listings return paths with a leading slash.
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

// Parse one metadata file per character. Traveler appears under each element, so keep the
// first entry here. main() restores the roster's element.
function parseCharacters(paths, names) {
  const re = /^\/src\/content\/([a-z]+)\/(\d)\/([a-z0-9-]+)\/metadata\.json$/;
  const out = [];
  const seen = new Set();
  for (const path of paths) {
    const m = re.exec(path);
    if (!m) continue;
    const [, element, rarity, slug] = m;
    // Validate the element and rarity before reserving the slug. This prevents a
    // non-character path such as src/content/site/... from hiding the real entry.
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

// Read only names backed by an entry in artifact_sets.json.
function parseSets(sets, names) {
  const out = [];
  for (const slug of Object.keys(sets)) {
    if (names[slug]) out.push(names[slug]);
    else console.warn(`no English name for artifact set ${slug}, skipped`);
  }
  return out;
}

async function main() {
  const [paths, charNames] = await Promise.all([
    listFiles(),
    getJSON(`${RAW_BASE}/src/i18n/en/characters.json`),
  ]);
  const upstream = parseCharacters(paths, charNames);
  // Upstream normally has about 119 characters. Fewer than 50 indicates a layout change.
  if (upstream.length < 50) {
    throw new Error(`only ${upstream.length} characters parsed, upstream layout likely changed`);
  }

  const { ROSTER } = await import(new URL("../src/data/roster.js", import.meta.url));
  // Reject duplicate roster slugs before building the map. Otherwise the later row replaces
  // the earlier row and the rewrite drops it.
  const dupSlug = ROSTER.map((c) => c.slug).find((s, i, a) => a.indexOf(s) !== i);
  if (dupSlug !== undefined) throw new Error(`two roster rows share the slug "${dupSlug}"`);
  // Preserve hand-maintained names, weapons, and regions. Refresh elements and rarities.
  const existing = new Map(
    ROSTER.map((c) => [c.slug, [c.name, c.element, c.weapon, c.rarity, c.region, c.slug]])
  );

  const result = new Map();
  const added = [];
  for (const c of upstream) {
    const e = existing.get(c.slug);
    if (e) {
      // Preserve Traveler's roster element because upstream lists it under every element.
      const element = c.slug === "traveler" ? e[1] : c.element;
      result.set(c.slug, [e[0], element, e[2], c.rarity, e[4], c.slug]);
      continue;
    }
    // Fetch weapons separately for new characters. Upstream does not provide regions.
    let weapon = null;
    try {
      const meta = await getJSON(
        `${RAW_BASE}/src/content/${c.element.toLowerCase()}/${c.rarity}/${c.slug}/metadata.json`
      );
      const w = cap(String(meta.weapon || ""));
      // Log unknown weapons separately from request failures. A schema change could make
      // every new weapon default to Sword.
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

  const kept = [];
  for (const [slug, e] of existing) {
    if (!result.has(slug)) {
      result.set(slug, e);
      kept.push(e);
    }
  }
  // An explicit slug points to a known upstream row. If it no longer matches, upstream may
  // have renamed the slug or removed the character. Stop before writing a stale row and a
  // duplicate under the new slug. This cannot detect a rename when both the display name
  // and an implicit slug change.
  const stale = kept.find((e) => e[5] !== slugify(e[0]));
  if (stale !== undefined) {
    throw new Error(`roster slug "${stale[5]}" (${stale[0]}) no longer exists upstream`);
  }

  const all = [...result.values()];
  // Display names are saved character IDs and keys in useTracker's byId object. Reject a
  // duplicate before the later row hides the earlier one. Duplicates can follow an upstream
  // slug rename or collide with a local display-name override.
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

  // Write only after both syncs succeed, then format both files.
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
