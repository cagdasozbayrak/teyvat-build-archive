// Character portraits are fetched by name at runtime — nothing is bundled.
// Primary source: Genshin Fandom wiki (Special:FilePath redirects to the card art).
// Fallback source: the community genshin.jmp.blue API. Then the element crest (in <Portrait>).
const WIKI_BASE = "https://genshin-impact.fandom.com/wiki/Special:FilePath/";
const PORTRAIT_BASE = "https://genshin.jmp.blue/characters";

// Characters whose wiki page title differs from the roster display name.
// (Roster now uses genshin.gg names, so most resolve directly; Childe's wiki
// page is "Tartaglia".)
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
  Traveler: null, // Traveler has split art; use crest
};

// Characters whose jmp.blue API slug differs from the slugified display name.
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

const slugify = (name) => name.toLowerCase().replace(/['.]/g, "").replace(/\s+/g, "-");

// Ordered list of image URLs to try for a character. <Portrait> falls through on error,
// finally showing the element crest if none resolve.
export function portraitCandidates(c) {
  const out = [];
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
