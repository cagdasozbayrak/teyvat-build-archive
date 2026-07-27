import CharacterCard from "./CharacterCard.jsx";

export default function CharacterGrid({ loading, list, owned, stats, hideDone, onOpen, onRequestRemove }) {
  if (loading) return <div className="empty">Opening the archive…</div>;

  if (list.length === 0) {
    return (
      <div className="empty">
        {stats.chars === 0 ? (
          <>
            <p className="empty-h">Your archive is empty.</p>
            <p>Use <b>Add character</b> up top to pick from the roster or create a new unit.</p>
            <p className="foot-note">Every character tracks 3 talents and 5 artifact slots — mark each one complete or upgrade needed. Progress saves automatically.</p>
          </>
        ) : hideDone && stats.fully === stats.chars ? (
          <p>Everything you're tracking is fully built. 🎉 Turn off <b>Hide completed</b> to see them.</p>
        ) : (
          <p>No characters match that filter.</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid">
      {list.map((c) => (
        <CharacterCard key={c.id} character={c} progress={owned[c.id]}
          onOpen={() => onOpen(c.id)} onRequestRemove={() => onRequestRemove(c.id)} />
      ))}
    </div>
  );
}
