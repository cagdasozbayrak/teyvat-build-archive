import { useState, useEffect, useMemo, useCallback } from "react";
import { ROSTER } from "../data/roster.js";
import { ARTIFACTS } from "../data/tracking.js";
import { STORAGE_KEY } from "../lib/constants.js";
import { store } from "../lib/storage.js";
import { blankProgress, normalizeProgress } from "../lib/progress.js";

// Owns the persisted tracker state (owned characters + custom roster additions)
// and every mutation. UI-only state (search, filters, open modals) lives in App.
export function useTracker() {
  const [owned, setOwned] = useState({});   // { charId: progress }
  const [custom, setCustom] = useState([]);  // extra roster entries the user created
  const [loading, setLoading] = useState(true);
  const [saveNote, setSaveNote] = useState("");

  const allRoster = useMemo(() => [...ROSTER, ...custom], [custom]);
  const byId = useMemo(() => Object.fromEntries(allRoster.map((c) => [c.id, c])), [allRoster]);

  // Load once on mount.
  useEffect(() => {
    (async () => {
      try {
        const res = await store.get(STORAGE_KEY);
        if (res && res.value) {
          const d = JSON.parse(res.value);
          const o = {};
          Object.keys(d.owned || {}).forEach((id) => { o[id] = normalizeProgress(d.owned[id]); });
          setOwned(o);
          setCustom(d.custom || []);
        }
      } catch (e) {
        /* first run / no storage — start empty */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback((nextOwned, nextCustom) => {
    const payload = JSON.stringify({ owned: nextOwned, custom: nextCustom });
    (async () => {
      const ok = await store.set(STORAGE_KEY, payload);
      setSaveNote(ok ? "Saved" : "Saved for this session only");
      setTimeout(() => setSaveNote(""), 1400);
    })();
  }, []);

  // Apply a state change and persist it. Pass null to leave owned/custom untouched.
  const update = useCallback((nextOwned, nextCustom) => {
    const o = nextOwned ?? owned;
    const c = nextCustom ?? custom;
    if (nextOwned) setOwned(nextOwned);
    if (nextCustom) setCustom(nextCustom);
    persist(o, c);
  }, [owned, custom, persist]);

  // Persist the current in-memory state (used by fields that update instantly
  // while typing and commit on blur).
  const commitField = useCallback(() => persist(owned, custom), [persist, owned, custom]);

  const addChar = (id) => {
    if (owned[id]) return;
    update({ ...owned, [id]: blankProgress() }, null);
  };

  const removeChar = (id) => {
    const next = { ...owned };
    delete next[id];
    update(next, null);
  };

  const addCustom = (entry) => {
    update({ ...owned, [entry.id]: blankProgress() }, [...custom, entry]);
  };

  const setTalent = (id, key, patch) => {
    const p = owned[id];
    const next = { ...p.talents[key], ...patch };
    // Keep target at or above level so "done" stays meaningful.
    if (patch.lvl != null && next.target < next.lvl) next.target = next.lvl;
    if (patch.target != null && next.lvl > next.target) next.lvl = next.target;
    update({ ...owned, [id]: { ...p, talents: { ...p.talents, [key]: next } } }, null);
  };

  const toggleArtifact = (id, key) => {
    const p = owned[id];
    const status = p.artifacts[key].status === "complete" ? "upgrade" : "complete";
    update({ ...owned, [id]: { ...p, artifacts: { ...p.artifacts, [key]: { ...p.artifacts[key], status } } } }, null);
  };

  const toggleReshape = (id, key) => {
    const p = owned[id];
    const cur = p.artifacts[key];
    update({ ...owned, [id]: { ...p, artifacts: { ...p.artifacts, [key]: { ...cur, reshape: !cur.reshape } } } }, null);
  };

  const setAllArtifactSets = (id, val) => {
    if (!val.trim()) return;
    const p = owned[id];
    const artifacts = {};
    ARTIFACTS.forEach((s) => { artifacts[s.key] = { ...p.artifacts[s.key], set: val }; });
    update({ ...owned, [id]: { ...p, artifacts } }, null);
  };

  // Instant-update fields (persist on blur via commitField).
  const setArtifactSet = (id, key, val) => {
    const p = owned[id];
    setOwned({ ...owned, [id]: { ...p, artifacts: { ...p.artifacts, [key]: { ...p.artifacts[key], set: val } } } });
  };

  const setStat = (id, key, field, val) => {
    const p = owned[id];
    const num = val === "" ? 0 : Math.max(0, Number(val) || 0);
    setOwned({ ...owned, [id]: { ...p, stats: { ...p.stats, [key]: { ...p.stats[key], [field]: num } } } });
  };

  const setImg = (id, val) => {
    const p = owned[id];
    setOwned({ ...owned, [id]: { ...p, img: val } });
  };

  return {
    owned, custom, loading, saveNote, allRoster, byId,
    addChar, removeChar, addCustom,
    setTalent, toggleArtifact, toggleReshape, setAllArtifactSets, setArtifactSet,
    setStat, setImg, commitField,
  };
}
