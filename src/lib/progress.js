import { TALENTS, ARTIFACTS, STATS } from "../data/tracking.js";
import { TALENT_MAX, DEFAULT_TARGET, clamp } from "./constants.js";

export const blankProgress = () => ({
  talents: TALENTS.reduce((a, t) => ((a[t.key] = { lvl: 1, target: DEFAULT_TARGET }), a), {}),
  artifacts: ARTIFACTS.reduce(
    (a, s) => ((a[s.key] = { status: "upgrade", set: "", reshape: false }), a),
    {}
  ),
  stats: STATS.reduce((a, s) => ((a[s.key] = { cur: 0, target: s.def }), a), {}),
  img: "",
  addedAt: Date.now(),
});

// Normalize saved progress and migrate the legacy "complete" and "upgrade" talent strings.
export function normalizeProgress(p) {
  p = p || {};
  const np = {
    img: p.img || "",
    addedAt: p.addedAt || Date.now(),
    talents: {},
    artifacts: {},
    stats: {},
  };

  TALENTS.forEach((t) => {
    const v = p.talents ? p.talents[t.key] : null;
    if (v && typeof v === "object") {
      np.talents[t.key] = {
        lvl: clamp(v.lvl ?? 1, 1, TALENT_MAX),
        target: clamp(v.target ?? DEFAULT_TARGET, 1, TALENT_MAX),
      };
    } else if (v === "complete") {
      np.talents[t.key] = { lvl: DEFAULT_TARGET, target: DEFAULT_TARGET };
    } else {
      np.talents[t.key] = { lvl: 1, target: DEFAULT_TARGET };
    }
  });

  ARTIFACTS.forEach((s) => {
    const v = p.artifacts ? p.artifacts[s.key] : null;
    np.artifacts[s.key] = {
      status: (v && v.status) || "upgrade",
      set: (v && v.set) || "",
      reshape: !!(v && v.reshape),
    };
  });

  STATS.forEach((s) => {
    const v = p.stats ? p.stats[s.key] : null;
    // Convert numeric strings before applying fallbacks so edited or old saves keep them.
    const cur = v ? Number(v.cur) : NaN;
    const target = v ? Number(v.target) : NaN;
    np.stats[s.key] = {
      cur: Number.isFinite(cur) ? cur : 0,
      target: Number.isFinite(target) ? target : s.def,
    };
  });

  return np;
}

export const talentDone = (t) => t.lvl >= t.target;

export const statMet = (s) => s.target > 0 && s.cur >= s.target;

// Card progress counts completed talents and artifacts.
export const countDone = (p) =>
  p
    ? TALENTS.filter((t) => talentDone(p.talents[t.key])).length +
      ARTIFACTS.filter((s) => p.artifacts[s.key].status === "complete").length
    : 0;
