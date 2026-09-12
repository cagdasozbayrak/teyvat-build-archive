import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ROSTER } from "../data/roster.js";
import { ARTIFACTS } from "../data/tracking.js";
import { ELEMENTS, WEAPON_PATHS } from "../data/elements.js";
import { STORAGE_KEY, TALENT_MAX, clamp } from "../lib/constants.js";
import { store } from "../lib/storage.js";
import { blankProgress, normalizeProgress } from "../lib/progress.js";

// Filter malformed custom entries and default invalid fields so edited or old saves cannot
// break the detail sheet.
function sanitizeCustom(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => c && typeof c.id === "string" && typeof c.name === "string")
    .map((c) => ({
      id: c.id,
      name: c.name,
      element: ELEMENTS[c.element] ? c.element : "Anemo",
      weapon: WEAPON_PATHS[c.weapon] ? c.weapon : "Sword",
      rarity: c.rarity === 4 ? 4 : 5,
      region: typeof c.region === "string" ? c.region : "—",
    }));
}

// Manage persisted characters, custom roster entries, and their mutations. App owns UI state.
export function useTracker() {
  const [owned, setOwned] = useState({}); // { charId: progress }
  const [custom, setCustom] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveNote, setSaveNote] = useState("");

  const allRoster = useMemo(() => [...ROSTER, ...custom], [custom]);
  const byId = useMemo(() => Object.fromEntries(allRoster.map((c) => [c.id, c])), [allRoster]);

  const noteTimer = useRef(null);

  // Load once. store.get catches storage errors, so only JSON.parse can throw.
  useEffect(() => {
    (async () => {
      const res = await store.get(STORAGE_KEY);
      if (res && res.value) {
        try {
          const d = JSON.parse(res.value);
          const o = {};
          Object.keys(d.owned || {}).forEach((id) => {
            o[id] = normalizeProgress(d.owned[id]);
          });
          setOwned(o);
          setCustom(sanitizeCustom(d.custom));
        } catch (e) {
          // Back up malformed data so a later save cannot overwrite it.
          store.set(STORAGE_KEY + ":corrupt", res.value);
        }
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback((nextOwned, nextCustom) => {
    const payload = JSON.stringify({ owned: nextOwned, custom: nextCustom });
    (async () => {
      const ok = !!(await store.set(STORAGE_KEY, payload));
      setSaveNote(ok ? "Saved" : "Saved for this session only");
      clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => setSaveNote(""), 1400);
    })();
  }, []);

  // Update and persist both state slices. Pass null to keep a slice unchanged.
  const update = useCallback(
    (nextOwned, nextCustom) => {
      const o = nextOwned ?? owned;
      const c = nextCustom ?? custom;
      if (nextOwned) setOwned(nextOwned);
      if (nextCustom) setCustom(nextCustom);
      persist(o, c);
    },
    [owned, custom, persist]
  );

  // Persist fields that update in memory while typing and save on blur.
  const commitField = useCallback(() => persist(owned, custom), [persist, owned, custom]);

  const addChar = (id) => {
    if (loading || owned[id]) return;
    update({ ...owned, [id]: blankProgress() }, null);
  };

  const removeChar = (id) => {
    const next = { ...owned };
    delete next[id];
    update(next, null);
  };

  const addCustom = (entry) => {
    if (loading) return;
    update({ ...owned, [entry.id]: blankProgress() }, [...custom, entry]);
  };

  // Apply a whole Enka import in one write. Splitting it per character would persist once
  // per row and leave a half-imported save if one of them threw.
  const importFromEnka = (patches) => {
    if (loading || !patches.length) return;
    const nextOwned = { ...owned };
    const added = [];
    patches.forEach(({ id, entry, progress }) => {
      nextOwned[id] = progress;
      if (entry && !custom.some((c) => c.id === id)) added.push(entry);
    });
    update(nextOwned, added.length ? [...custom, ...added] : null);
  };

  const setTalent = (id, key, patch) => {
    const p = owned[id];
    const next = { ...p.talents[key], ...patch };
    // Clamp both values and keep the level at or below the target.
    next.lvl = clamp(next.lvl, 1, TALENT_MAX);
    next.target = clamp(next.target, 1, TALENT_MAX);
    if (patch.lvl != null && next.target < next.lvl) next.target = next.lvl;
    if (patch.target != null && next.lvl > next.target) next.lvl = next.target;
    update({ ...owned, [id]: { ...p, talents: { ...p.talents, [key]: next } } }, null);
  };

  const toggleArtifact = (id, key) => {
    const p = owned[id];
    const status = p.artifacts[key].status === "complete" ? "upgrade" : "complete";
    update(
      {
        ...owned,
        [id]: { ...p, artifacts: { ...p.artifacts, [key]: { ...p.artifacts[key], status } } },
      },
      null
    );
  };

  const toggleReshape = (id, key) => {
    const p = owned[id];
    const cur = p.artifacts[key];
    update(
      {
        ...owned,
        [id]: { ...p, artifacts: { ...p.artifacts, [key]: { ...cur, reshape: !cur.reshape } } },
      },
      null
    );
  };

  const setAllArtifactSets = (id, val) => {
    if (!val.trim()) return;
    const p = owned[id];
    const artifacts = {};
    ARTIFACTS.forEach((s) => {
      artifacts[s.key] = { ...p.artifacts[s.key], set: val };
    });
    update({ ...owned, [id]: { ...p, artifacts } }, null);
  };

  // Update typing fields in memory. commitField persists them on blur.
  const setArtifactSet = (id, key, val) => {
    const p = owned[id];
    setOwned({
      ...owned,
      [id]: { ...p, artifacts: { ...p.artifacts, [key]: { ...p.artifacts[key], set: val } } },
    });
  };

  // Keep raw stat text until blur so users can type decimals such as "77.5". Convert and
  // persist the value once on commit.
  const commitStat = (id, key, field, val) => {
    const p = owned[id];
    const num = String(val).trim() === "" ? 0 : Math.max(0, Number(val) || 0);
    update(
      { ...owned, [id]: { ...p, stats: { ...p.stats, [key]: { ...p.stats[key], [field]: num } } } },
      null
    );
  };

  const setImg = (id, val) => {
    const p = owned[id];
    setOwned({ ...owned, [id]: { ...p, img: val } });
  };

  return {
    owned,
    custom,
    loading,
    saveNote,
    allRoster,
    byId,
    addChar,
    removeChar,
    addCustom,
    importFromEnka,
    setTalent,
    toggleArtifact,
    toggleReshape,
    setAllArtifactSets,
    setArtifactSet,
    commitStat,
    setImg,
    commitField,
  };
}
