import { TALENTS, ARTIFACTS, STATS } from "../data/tracking.js";
import { TALENT_MAX, clamp } from "./constants.js";
import { ENKA_CHARS, SKILL_ORDER, SET_NAMES } from "../data/enka.js";
import { blankProgress } from "./progress.js";

// Enka's equip slot names, in the order ARTIFACTS declares the slots.
const SLOTS = {
  EQUIP_BRACER: "flower",
  EQUIP_NECKLACE: "plume",
  EQUIP_SHOES: "sands",
  EQUIP_RING: "goblet",
  EQUIP_DRESS: "circlet",
};

// fightPropMap keys, paired with whether the value is a ratio that scales to percent.
const STAT_PROPS = {
  critRate: [20, true],
  critDmg: [22, true],
  er: [23, true],
  em: [28, false],
  atk: [2001, false],
  hp: [2000, false],
  def: [2002, false],
  healing: [26, true],
};

// Damage bonus is one prop per element plus 30 for physical. Confirmed against a live
// payload: Ganyu reports 46 for Cryo and Xingqiu reports 42 for Hydro.
const ELEM_DMG = {
  Pyro: 40,
  Electro: 41,
  Hydro: 42,
  Dendro: 43,
  Anemo: 44,
  Geo: 45,
  Cryo: 46,
};
const PHYS_DMG = 30;

// A missing prop means the character has none of that stat, which reads as zero.
function prop(map, key, pct) {
  const v = Number(map?.[key]);
  if (!Number.isFinite(v)) return 0;
  return Math.round((pct ? v * 100 : v) * 10) / 10;
}

// Convert one showcased character into the progress an import would write. Talent targets,
// artifact status, reshape flags, stat targets and the portrait override all carry over
// from `getProgress`, because Enka cannot know them. Returns null when the store has no
// entry for the avatarId, which means it is newer than the generated tables.
export function mapAvatar(avatar, getProgress) {
  const meta = ENKA_CHARS[String(avatar?.avatarId)];
  if (!meta) return null;

  const base = getProgress?.(meta.id) || blankProgress();
  const order = SKILL_ORDER[String(avatar.avatarId)] || [];

  const talents = {};
  TALENTS.forEach((t, i) => {
    const lvl = Number(avatar.skillLevelMap?.[order[i]]);
    // Constellations 3 and 5 add three levels through proudSkillExtraLevelMap. TALENT_MAX
    // is 10, so folding that in would report a level 7 talent as maxed. skillLevelMap holds
    // the level talent books raise, which is what the tracker counts.
    talents[t.key] = Number.isFinite(lvl)
      ? { ...base.talents[t.key], lvl: clamp(lvl, 1, TALENT_MAX) }
      : base.talents[t.key];
  });

  const artifacts = {};
  ARTIFACTS.forEach((s) => {
    artifacts[s.key] = base.artifacts[s.key];
  });
  (avatar.equipList || []).forEach((e) => {
    const slot = SLOTS[e?.flat?.equipType];
    const set = SET_NAMES[e?.flat?.setNameTextMapHash];
    // An unresolved set means the generated table lags ARTIFACT_SETS. Keep what is there
    // rather than overwriting a typed name with a placeholder.
    if (slot && set) artifacts[slot] = { ...artifacts[slot], set };
  });

  const stats = {};
  STATS.forEach((s) => {
    const spec = STAT_PROPS[s.key];
    if (spec) {
      stats[s.key] = { ...base.stats[s.key], cur: prop(avatar.fightPropMap, spec[0], spec[1]) };
    } else if (s.key === "dmgBonus") {
      // A goblet carries either an elemental bonus or a physical one, never both.
      const elemental = prop(avatar.fightPropMap, ELEM_DMG[meta.element], true);
      stats[s.key] = {
        ...base.stats[s.key],
        cur: elemental || prop(avatar.fightPropMap, PHYS_DMG, true),
      };
    } else {
      stats[s.key] = base.stats[s.key];
    }
  });

  return { id: meta.id, meta, progress: { ...base, talents, artifacts, stats } };
}
