import { useState, useMemo } from "react";
import "./theme.css";
import { ITEMS_PER_CHAR } from "./data/tracking.js";
import { countDone } from "./lib/progress.js";
import { useTracker } from "./hooks/useTracker.js";
import Hero from "./components/Hero.jsx";
import Toolbar from "./components/Toolbar.jsx";
import CharacterGrid from "./components/CharacterGrid.jsx";
import AddModal from "./components/AddModal.jsx";
import ImportModal from "./components/ImportModal.jsx";
import DetailModal from "./components/DetailModal.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";

export default function App() {
  const t = useTracker();
  const { owned, byId, allRoster, loading, saveNote } = t;

  const [search, setSearch] = useState("");
  const [elemFilter, setElemFilter] = useState(null);
  const [hideDone, setHideDone] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const ownedList = useMemo(
    () =>
      Object.keys(owned)
        .map((id) => byId[id])
        .filter(Boolean)
        .filter((c) => (elemFilter ? c.element === elemFilter : true))
        .filter((c) => (hideDone ? countDone(owned[c.id]) < ITEMS_PER_CHAR : true))
        .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name)),
    [owned, byId, elemFilter, hideDone, search]
  );

  const stats = useMemo(() => {
    const ids = Object.keys(owned);
    const done = ids.reduce((s, id) => s + countDone(owned[id]), 0);
    const fully = ids.filter((id) => countDone(owned[id]) === ITEMS_PER_CHAR).length;
    return { chars: ids.length, done, total: ids.length * ITEMS_PER_CHAR, fully };
  }, [owned]);

  const detail = detailId ? byId[detailId] : null;
  const detailP = detailId ? owned[detailId] : null;

  const confirmRemove = () => {
    const id = confirmId;
    setConfirmId(null);
    if (detailId === id) setDetailId(null);
    t.removeChar(id);
  };

  return (
    <div className="gbt">
      <Hero stats={stats} />

      <Toolbar
        search={search}
        setSearch={setSearch}
        elemFilter={elemFilter}
        setElemFilter={setElemFilter}
        hideDone={hideDone}
        setHideDone={setHideDone}
        onAdd={() => setAddOpen(true)}
        onImport={() => setImportOpen(true)}
      />

      {saveNote && <div className="save-note">{saveNote}</div>}

      <CharacterGrid
        loading={loading}
        list={ownedList}
        owned={owned}
        stats={stats}
        hideDone={hideDone}
        onOpen={setDetailId}
        onRequestRemove={setConfirmId}
      />

      {addOpen && (
        <AddModal
          roster={allRoster}
          owned={owned}
          onAdd={t.addChar}
          onAddCustom={t.addCustom}
          onClose={() => setAddOpen(false)}
        />
      )}

      {importOpen && (
        <ImportModal
          byId={byId}
          owned={owned}
          onImport={t.importFromEnka}
          onClose={() => setImportOpen(false)}
        />
      )}

      {detail && detailP && (
        <DetailModal
          character={detail}
          progress={detailP}
          actions={{
            setTalent: t.setTalent,
            toggleArtifact: t.toggleArtifact,
            setArtifactSet: t.setArtifactSet,
            setAllArtifactSets: t.setAllArtifactSets,
            toggleReshape: t.toggleReshape,
            commitStat: t.commitStat,
            setImg: t.setImg,
            commitField: t.commitField,
          }}
          onRemove={() => setConfirmId(detail.id)}
          onClose={() => setDetailId(null)}
        />
      )}

      {confirmId && byId[confirmId] && (
        <ConfirmDialog
          name={byId[confirmId].name}
          onCancel={() => setConfirmId(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}
