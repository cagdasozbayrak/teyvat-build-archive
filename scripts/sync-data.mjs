// Refresh the static roster + artifact sets from genshin.gg, which tracks the
// current game (unlike the jmp.blue API, which lags and lacks the newest units).
// genshin.gg has no JSON API, so this scrapes HTML; the union-merge (never delete)
// plus the human-reviewed sync PR contain the blast radius of a bad scrape.
//
// The homepage lists every character with name/element/rarity/slug but NOT weapon
// or region. To avoid fetching all ~117 character pages, we fetch a page only for
// slugs missing from the current roster (weapon type). Region has no clean field on
// the site, so new entries get "—" for a human to fill in during PR review.
// Run: npm run sync:data
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const SITE = "https://genshin.gg";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const ROSTER_FILE = "src/data/roster.js";
const TRACKING_FILE = "src/data/tracking.js";
const ELEMENTS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"];
const WEAPONS = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"];

async function getHTML(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

// Minimal HTML entity decode for the names we extract.
function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Parse the homepage character grid: each entry is an anchor to /characters/<slug>/
// holding the rarity (rarity-N class), the element (character-type img alt), and the
// display name (h2.character-name). The portrait URL is derived from the name in
// portraitCandidates (a fixed CDN pattern), so it isn't scraped here.
function parseCharacters(html) {
  const re =
    /<a href="\/characters\/([a-z0-9-]+)\/"[^>]*class="character-portrait(?: character-new)?"[^>]*>\s*<img[^>]*class="character-icon rarity-(\d)"[^>]*>\s*<img alt="([^"]*)"[^>]*class="character-type"[^>]*>\s*<h2 class="character-name">([^<]*)<\/h2>/g;  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const [, slug, rarity, element, name] = m;
    out.push({ slug, name: decode(name), element, rarity: Number(rarity) });
  }
  return out;
}

// The character's weapon type is the single img with class="character-path-icon"
// whose alt is a weapon (the sibling path icon with the same class is the element).
function parseWeapon(html) {
  const re = /<img alt="([^"]+)"[^>]*class="character-path-icon"/g;
  let m;
  while ((m = re.exec(html))) {
    if (WEAPONS.includes(m[1])) return m[1];
  }
  return null;
}

// Artifact set names are the alt text of the set table's images.
function parseSets(html) {
  const re = /<img alt="([^"]+)"[^>]*class="table-image/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(decode(m[1]));
  return out;
}

async function main() {
  // --- characters (homepage list) ---
  const scraped = parseCharacters(await getHTML(`${SITE}/`)).filter(
    (c) => ELEMENTS.includes(c.element) && (c.rarity === 4 || c.rarity === 5)
  );
  if (scraped.length < 50) {
    throw new Error(`only ${scraped.length} characters parsed — homepage markup likely changed`);
  }

  const { ROSTER } = await import(new URL("../src/data/roster.js", import.meta.url));
  // Existing tuples keyed by name; weapon (index 2) and region (index 4) are
  // manually maintained and preserved, everything else is refreshed from the scrape.
  const existing = new Map(
    ROSTER.map((c) => [c.name.toLowerCase(), [c.name, c.element, c.weapon, c.rarity, c.region]])
  );

  const result = new Map();
  const added = [];
  for (const c of scraped) {
    const key = c.name.toLowerCase();
    const e = existing.get(key);
    let weapon, region;
    if (e) {
      weapon = e[2]; // keep manually-set weapon
      region = e[4]; // keep manually-set region
    } else {
      // New character: fetch its page only for the weapon type; region has no clean field.
      let w = null;
      try {
        w = parseWeapon(await getHTML(`${SITE}/characters/${c.slug}/`));
      } catch (err) {
        console.warn(`could not fetch page for ${c.slug}: ${err.message}`);
      }
      weapon = w || "Sword";
      region = "—";
      added.push(
        `${c.name} (${c.element} ${c.rarity}★, ${w || "Sword?"}${w ? "" : " — weapon GUESSED"}, region "—" — set both manually)`
      );
    }
    result.set(key, [c.name, c.element, weapon, c.rarity, region]);
  }

  // Keep characters genshin.gg doesn't list (union-merge: never delete).
  const kept = [];
  for (const [key, e] of existing) {
    if (!result.has(key)) {
      result.set(key, e);
      kept.push(e[0]);
    }
  }

  const all = [...result.values()];
  const line = (t) =>
    `  [${JSON.stringify(t[0])}, ${JSON.stringify(t[1])}, ${JSON.stringify(t[2])}, ${t[3]}, ${JSON.stringify(t[4])}],`;
  const fives = all.filter((t) => t[3] === 5).sort((a, b) => a[0].localeCompare(b[0]));
  const fours = all.filter((t) => t[3] === 4).sort((a, b) => a[0].localeCompare(b[0]));
  const rawBody = ["  // 5-star", ...fives.map(line), "  // 4-star", ...fours.map(line)].join("\n");

  let rsrc = await readFile(ROSTER_FILE, "utf8");
  rsrc = rsrc.replace(/const RAW = \[[\s\S]*?\n\];/, `const RAW = [\n${rawBody}\n];`);

  // --- artifact sets ---
  const scrapedSets = parseSets(await getHTML(`${SITE}/artifacts/`));
  if (scrapedSets.length < 30) {
    throw new Error(`only ${scrapedSets.length} sets parsed — artifacts markup likely changed`);
  }

  const { ARTIFACT_SETS } = await import(new URL("../src/data/tracking.js", import.meta.url));
  const setMap = new Map(ARTIFACT_SETS.map((s) => [s.toLowerCase(), s]));
  const addedSets = [];
  for (const s of scrapedSets) {
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
  console.log(`kept ${kept.length} not on genshin.gg: ${kept.join(", ") || "none"}`);
}

main().catch((e) => {
  console.error(`sync failed: ${e.message}`);
  process.exit(1);
});
