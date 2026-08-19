// Portraits load from the network at runtime. Nothing is bundled. First source is the
// build site's own portrait asset, served over jsDelivr from its public repo. After that
// the Genshin Fandom wiki (Special:FilePath), then the community genshin.jmp.blue API,
// then the element crest (in <Portrait>).
import { slugify } from "../lib/slug.js";

// Square face avatars on a transparent background, at
// <base>/<element>/<rarity>/<slug>/portrait.webp. Same slug the build guide uses.
const BUILD_PORTRAIT =
  "https://cdn.jsdelivr.net/gh/Genshin-Impact-Helper-Team/genshin-builds@main/src/assets/character-assets/";
const WIKI_BASE = "https://genshin-impact.fandom.com/wiki/Special:FilePath/";
const PORTRAIT_BASE = "https://genshin.jmp.blue/characters";

// Characters whose wiki page title differs from the roster display name. Childe's page
// is "Tartaglia".
const WIKI_NAME = {
  Ayaka: "Kamisato Ayaka",
  Ayato: "Kamisato Ayato",
  Raiden: "Raiden Shogun",
  Itto: "Arataki Itto",
  Kazuha: "Kaedehara Kazuha",
  Heizou: "Shikanoin Heizou",
  Sara: "Kujou Sara",
  Kokomi: "Sangonomiya Kokomi",
  Childe: "Tartaglia",
  Traveler: null, // the wiki has no single Traveler avatar, so skip this source
};

// Characters whose jmp.blue API slug differs from the slugified display name. Eight of
// these match the build source's slug and two don't. jmp.blue writes "raiden-shogun" for
// "shogun-raiden", and "traveler-anemo" where the build source has plain "traveler". So
// the two tables stay separate.
const SLUG_OVERRIDE = {
  Ayaka: "kamisato-ayaka",
  Ayato: "kamisato-ayato",
  Raiden: "raiden-shogun",
  Itto: "arataki-itto",
  Kazuha: "kaedehara-kazuha",
  Heizou: "shikanoin-heizou",
  Sara: "kujou-sara",
  Kokomi: "sangonomiya-kokomi",
  Childe: "tartaglia",
  Traveler: "traveler-anemo",
};

// Ordered list of image URLs to try for a character. <Portrait> falls through on error,
// finally showing the element crest if none resolve.
export function portraitCandidates(c) {
  const out = [];
  // Build-site portrait. Skipped for custom characters, which have no slug.
  if (c.slug) {
    out.push(`${BUILD_PORTRAIT}${c.element.toLowerCase()}/${c.rarity}/${c.slug}/portrait.webp`);
  }
  const wiki = Object.prototype.hasOwnProperty.call(WIKI_NAME, c.name) ? WIKI_NAME[c.name] : c.name;
  // "<name> Icon.png" is the square face avatar — the right shape for the 78px
  // card slot. (The old "Character <name> Card.png" never resolved and silently
  // fell through to jmp.blue; "Game.png" resolves but is full-body splash that
  // crops to the torso.) ?width= serves a resized thumbnail, not the full art.
  if (wiki) out.push(WIKI_BASE + encodeURIComponent(`${wiki} Icon.png`) + "?width=256");
  const s = SLUG_OVERRIDE[c.name] || slugify(c.name);
  out.push(`${PORTRAIT_BASE}/${s}/icon-big`, `${PORTRAIT_BASE}/${s}/card`);
  return out;
}
