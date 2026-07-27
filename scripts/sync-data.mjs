// Refresh the static roster + artifact sets from the community jmp.blue API.
// Union-merge only: existing entries are never removed (the API lags the game,
// so it lacks the newest characters/sets we already ship). Run: npm run sync:data
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const API = "https://genshin.jmp.blue";
const UA = "teyvat-build-archive-sync";
const ROSTER_FILE = "src/data/roster.js";
const TRACKING_FILE = "src/data/tracking.js";

// API display name -> roster short name (mirrors WIKI_NAME in src/data/portraits.js).
const ALIAS = {
  "Kamisato Ayaka": "Ayaka",
  "Kamisato Ayato": "Ayato",
  "Raiden Shogun": "Raiden",
  "Arataki Itto": "Itto",
  "Kaedehara Kazuha": "Kazuha",
  "Shikanoin Heizou": "Heizou",
  "Kujou Sara": "Sara",
  "Kuki Shinobu": "Shinobu",
  "Sangonomiya Kokomi": "Kokomi",
  "Yumemizuki Mizuki": "Mizuki",
};

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Run fn over items with a fixed concurrency; results preserve input order.
async function mapLimit(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

async function main() {
  // --- characters ---
  const charSlugs = await getJSON(`${API}/characters`); // hard-fails if unreachable
  const chars = (
    await mapLimit(charSlugs, 8, async (slug) => {
      try {
        return await getJSON(`${API}/characters/${slug}`);
      } catch (e) {
        console.warn(`skip character ${slug}: ${e.message}`);
        return null;
      }
    })
  ).filter(Boolean);

  const apiChars = chars.map((c) => [
    ALIAS[c.name] || c.name,
    c.vision,
    c.weapon,
    c.rarity,
    c.nation || "—",
  ]);

  const { ROSTER } = await import(new URL("../src/data/roster.js", import.meta.url));
  const existing = ROSTER.map((c) => [c.name, c.element, c.weapon, c.rarity, c.region]);
  const byName = new Map(existing.map((t) => [t[0].toLowerCase(), t]));
  const addedChars = [];
  for (const t of apiChars) {
    const k = t[0].toLowerCase();
    if (!byName.has(k)) {
      byName.set(k, t);
      addedChars.push(t[0]);
    }
  }
  const all = [...byName.values()];
  const line = (t) =>
    `  [${JSON.stringify(t[0])}, ${JSON.stringify(t[1])}, ${JSON.stringify(t[2])}, ${t[3]}, ${JSON.stringify(t[4])}],`;
  const fives = all.filter((t) => t[3] === 5).sort((a, b) => a[0].localeCompare(b[0]));
  const fours = all.filter((t) => t[3] === 4).sort((a, b) => a[0].localeCompare(b[0]));
  const rawBody = ["  // 5-star", ...fives.map(line), "  // 4-star", ...fours.map(line)].join("\n");

  let rsrc = await readFile(ROSTER_FILE, "utf8");
  rsrc = rsrc.replace(/const RAW = \[[\s\S]*?\n\];/, `const RAW = [\n${rawBody}\n];`);

  // --- artifact sets ---
  const setSlugs = await getJSON(`${API}/artifacts`); // hard-fails if unreachable
  const apiSets = (
    await mapLimit(setSlugs, 8, async (slug) => {
      try {
        return (await getJSON(`${API}/artifacts/${slug}`)).name;
      } catch (e) {
        console.warn(`skip set ${slug}: ${e.message}`);
        return null;
      }
    })
  ).filter(Boolean);

  const { ARTIFACT_SETS } = await import(new URL("../src/data/tracking.js", import.meta.url));
  const setMap = new Map(ARTIFACT_SETS.map((s) => [s.toLowerCase(), s]));
  const addedSets = [];
  for (const s of apiSets) {
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

  const keptChars = existing
    .map((t) => t[0])
    .filter((n) => !apiChars.some((a) => a[0].toLowerCase() === n.toLowerCase()));
  console.log(
    `characters: +${addedChars.length}${addedChars.length ? ` (${addedChars.join(", ")})` : ""}`
  );
  console.log(`sets: +${addedSets.length}${addedSets.length ? ` (${addedSets.join(", ")})` : ""}`);
  console.log(`kept ${keptChars.length} characters the API lacks: ${keptChars.join(", ")}`);
}

main().catch((e) => {
  console.error(`sync failed: ${e.message}`);
  process.exit(1);
});
