import { TALENTS, ARTIFACTS, STATS } from "../data/tracking.js";
import { TALENT_MAX, DEFAULT_TARGET, clamp } from "./constants.js";

// A fresh, empty progress record for a newly added character.
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

// Bring any stored record into the current shape, including the old string-based
// talent format ("complete" / "upgrade") from early versions of the app.
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
    np.stats[s.key] = {
      cur: v && Number.isFinite(v.cur) ? v.cur : 0,
      target: v && Number.isFinite(v.target) ? v.target : s.def,
    };
  });

  return np;
}

// A talent is "done" once its level reaches its target.
export const talentDone = (t) => t.lvl >= t.target;

// A stat target is "met" only when a target is set and the current value reaches it.
export const statMet = (s) => s.target > 0 && s.cur >= s.target;

// Count of completed items (done talents + complete artifacts) for the card ring.
export const countDone = (p) =>
  p
    ? TALENTS.filter((t) => talentDone(p.talents[t.key])).length +
      ARTIFACTS.filter((s) => p.artifacts[s.key].status === "complete").length
    : 0;
