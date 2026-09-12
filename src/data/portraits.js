// Portraits load at runtime. Try the build source, Fandom wiki, and jmp.blue in order.
// <Portrait> shows an element-colored initial if all sources fail.
import { slugify } from "../lib/slug.js";

// Build portraits are square transparent avatars at
// <base>/<element>/<rarity>/<slug>/portrait.webp.
const BUILD_PORTRAIT =
  "https://cdn.jsdelivr.net/gh/Genshin-Impact-Helper-Team/genshin-builds@main/src/assets/character-assets/";
const WIKI_BASE = "https://genshin-impact.fandom.com/wiki/Special:FilePath/";
const PORTRAIT_BASE = "https://genshin.jmp.blue/characters";

// Wiki page names that differ from roster names.
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
  Traveler: null, // The wiki has no single Traveler avatar.
  "Cryo Traveler": null,
  "Dendro Traveler": null,
  "Electro Traveler": null,
  "Geo Traveler": null,
  "Hydro Traveler": null,
  "Pyro Traveler": null,
};

// jmp.blue uses different slugs for some characters. Keep these separate from build slugs
// because Raiden and Traveler differ between the sources.
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

// Return portrait URLs in fallback order.
export function portraitCandidates(c) {
  const out = [];
  // Custom characters have no build portrait because they have no slug.
  if (c.slug) {
    out.push(`${BUILD_PORTRAIT}${c.element.toLowerCase()}/${c.rarity}/${c.slug}/portrait.webp`);
  }
  const wiki = Object.prototype.hasOwnProperty.call(WIKI_NAME, c.name) ? WIKI_NAME[c.name] : c.name;
  // The wiki's "<name> Icon.png" is a square face avatar. The old
  // "Character <name> Card.png" path does not resolve, and "Game.png" crops to the torso.
  // `?width=256` requests a thumbnail.
  if (wiki) out.push(WIKI_BASE + encodeURIComponent(`${wiki} Icon.png`) + "?width=256");
  const s = SLUG_OVERRIDE[c.name] || slugify(c.name);
  out.push(`${PORTRAIT_BASE}/${s}/icon-big`, `${PORTRAIT_BASE}/${s}/card`);
  return out;
}
