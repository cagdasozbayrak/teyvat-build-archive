// Generate the Enka lookup tables in src/data/enka.js.
//
// Sources, from Enka's published store on the master branch:
// - store/gi/avatars.json: avatarId -> element, weapon, rarity, name hash, skill order
// - store/gi/locs.json: text map hash -> localized string, 15 languages
// - store/gi/relics.json: artifact set id -> name hash, plus item metadata
//
// Run after sync-data.mjs. The artifact set filter reads ARTIFACT_SETS and the character
// match reads ROSTER, both of which that script refreshes. `npm run sync:data` chains them.
import { writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { slugify } from "../src/lib/slug.js";
import { ROSTER } from "../src/data/roster.js";
import { ARTIFACT_SETS } from "../src/data/tracking.js";

const REPO = "EnkaNetwork/API-docs";
const BRANCH = "master";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/store`;
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/store`;
const OUT_FILE = "src/data/enka.js";

// Enka names elements after their game-internal terms.
const ELEMENTS = {
  Fire: "Pyro",
  Water: "Hydro",
  Wind: "Anemo",
  Rock: "Geo",
  Electric: "Electro",
  Ice: "Cryo",
  Grass: "Dendro",
};
const WEAPONS = {
  WEAPON_SWORD_ONE_HAND: "Sword",
  WEAPON_CLAYMORE: "Claymore",
  WEAPON_POLE: "Polearm",
  WEAPON_BOW: "Bow",
  WEAPON_CATALYST: "Catalyst",
};
// Slugifying the Enka name matches the roster slug for every renamed character except this
// one, where the roster slug reverses the words.
const NAME_OVERRIDE = { "Raiden Shogun": "Raiden" };
// Both ids are the Traveler. The store splits them further by depot: a hyphenated key
// such as "10000005-506" is one playable element, keyed by skillDepotId.
const TRAVELER_IDS = ["10000005", "10000007"];

// The Anemo depots keep the roster's single "Traveler" row, so an existing save is not
// orphaned. Every other element gets its own row because the roster has no way to track
// two elements under one id at once.
function travelerId(element) {
  return element === "Anemo" ? "Traveler" : `Traveler (${element})`;
}

async function getJSON(name) {
  for (const base of [RAW_BASE, CDN_BASE]) {
    try {
      const res = await fetch(`${base}/${name}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`${base}/${name} unavailable (${err.message})`);
    }
  }
  throw new Error(`could not fetch ${name} from either source`);
}

// Resolve one Enka display name to a roster id. Returns null when nothing matches, which
// means the character released after the last roster sync.
function matchRoster(name, byName, bySlug) {
  if (NAME_OVERRIDE[name]) return NAME_OVERRIDE[name];
  const exact = byName.get(name.toLowerCase());
  if (exact) return exact.id;
  const viaSlug = bySlug.get(slugify(name));
  return viaSlug ? viaSlug.id : null;
}

function buildChars(store, loc, byName, bySlug) {
  const chars = {};
  const order = {};
  const unmatched = [];
  let matched = 0;
  let travelerDepots = 0;

  for (const [avatarId, meta] of Object.entries(store)) {
    if (avatarId.includes("-")) {
      const [baseId] = avatarId.split("-");
      // A hyphenated key that is not one of the two Traveler ids is some other kind of
      // store row (a costume, a trial loadout); it never appears as a showcase avatarId.
      if (!TRAVELER_IDS.includes(baseId)) continue;
      // Depot 501/701 is the elementless base before a vision is chosen. A showcase never
      // reports it.
      if (meta.Element === "None") continue;
      const element = ELEMENTS[meta.Element] ?? "Anemo";
      chars[avatarId] = { id: travelerId(element), element, weapon: "Sword", rarity: 5 };
      if (Array.isArray(meta.SkillOrder) && meta.SkillOrder.length === 3) {
        order[avatarId] = meta.SkillOrder;
      }
      travelerDepots++;
      continue;
    }
    const name = loc[String(meta.NameTextMapHash)];
    // Unreleased and internal entries have no name. Trial and test dummies are not playable.
    if (!name || /\((Trial|Test)\)$/.test(name)) continue;

    const isTraveler = TRAVELER_IDS.includes(avatarId);
    const id = isTraveler ? "Traveler" : matchRoster(name, byName, bySlug);
    if (id) matched++;
    else unmatched.push(`${name} (${avatarId})`);

    const roster = id ? byName.get(id.toLowerCase()) : null;
    chars[avatarId] = {
      id: id || name,
      // A matched character keeps the roster's own element and weapon so the two never
      // disagree. Only an unmatched one relies on the store.
      element: roster ? roster.element : (ELEMENTS[meta.Element] ?? "Anemo"),
      weapon: roster ? roster.weapon : (WEAPONS[meta.WeaponType] ?? "Sword"),
      rarity: roster ? roster.rarity : meta.QualityType === "QUALITY_PURPLE" ? 4 : 5,
    };
    if (Array.isArray(meta.SkillOrder) && meta.SkillOrder.length === 3) {
      order[avatarId] = meta.SkillOrder;
    }
  }

  if (matched < 100) {
    throw new Error(`only ${matched} characters matched the roster, store layout likely changed`);
  }
  return { chars, order, unmatched, travelerDepots };
}

// Keyed by the artifact set id (relics.json's Sets keys, e.g. "15020"), which is what a
// showcased equip's flat.setId reports. Each set's name is one more hop through loc: the
// set's Name field is itself a text map hash.
function buildSets(loc, relics) {
  const want = new Map(ARTIFACT_SETS.map((s) => [s.toLowerCase(), s]));
  const sets = {};
  const covered = new Set();
  for (const [setId, meta] of Object.entries(relics.Sets)) {
    const value = loc[String(meta.Name)];
    if (typeof value !== "string") continue;
    const canonical = want.get(value.toLowerCase());
    if (!canonical) continue;
    covered.add(canonical);
    sets[setId] = canonical;
  }
  return { sets, missing: ARTIFACT_SETS.filter((s) => !covered.has(s)) };
}

const literal = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join("\n");

async function main() {
  const [store, locAll, relics] = await Promise.all([
    getJSON("gi/avatars.json"),
    getJSON("gi/locs.json"),
    getJSON("gi/relics.json"),
  ]);
  const loc = locAll.en;
  if (!loc) throw new Error("locs.json has no English map");

  const byName = new Map(ROSTER.map((c) => [c.name.toLowerCase(), c]));
  const bySlug = new Map(ROSTER.map((c) => [c.slug, c]));
  const { chars, order, unmatched, travelerDepots } = buildChars(store, loc, byName, bySlug);
  const { sets, missing } = buildSets(loc, relics);

  const src = `// Generated by scripts/sync-enka.mjs. Do not edit by hand.
//
// ENKA_CHARS maps an Enka avatarId to the roster id it belongs to, plus enough metadata to
// create a custom entry when the character is newer than the roster. SKILL_ORDER lists the
// skill ids in the order TALENTS declares them: normal attack, elemental skill, elemental
// burst. SET_NAMES resolves an artifact set id to its English name.

export const ENKA_CHARS = {
${literal(chars)}
};

export const SKILL_ORDER = {
${literal(order)}
};

export const SET_NAMES = {
${literal(sets)}
};
`;

  await writeFile(OUT_FILE, src);
  await promisify(execFile)("npx", ["prettier", "--write", OUT_FILE]);

  console.log(
    `characters: ${Object.keys(chars).length}, skill orders: ${Object.keys(order).length}`
  );
  console.log(`traveler depots: ${travelerDepots}`);
  console.log(`sets: ${new Set(Object.values(sets)).size} of ${ARTIFACT_SETS.length} resolved`);
  if (missing.length) console.log(`  no id yet: ${missing.join(", ")}`);
  console.log(`not in roster: ${unmatched.join(", ") || "none"}`);
}

main().catch((e) => {
  console.error(`enka sync failed: ${e.message}`);
  process.exit(1);
});
