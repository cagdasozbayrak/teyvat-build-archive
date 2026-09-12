import { TALENTS, ARTIFACTS } from "../data/tracking.js";
import { ELEMENTS } from "../data/elements.js";
import { useModalDismiss } from "../hooks/useModalDismiss.js";
import { useEnkaImport } from "../hooks/useEnkaImport.js";
import ElementIcon from "./ElementIcon.jsx";

// Summarize what a row would write, so the user can judge before applying it.
function summary(progress) {
  const talents = TALENTS.map((t) => progress.talents[t.key].lvl).join("/");
  const sets = ARTIFACTS.filter((s) => progress.artifacts[s.key].set).length;
  const s = progress.stats;
  return `Talents ${talents} · ${sets}/5 sets · CRIT ${s.critRate.cur}/${s.critDmg.cur} · ER ${s.er.cur}%`;
}

export default function ImportModal({ loading, byId, owned, onImport, onClose }) {
  const dismiss = useModalDismiss(onClose);
  const e = useEnkaImport({ byId, owned });
  const chosen = e.rows.filter((r) => e.picked[r.id]);

  const apply = () => {
    const applied = onImport(
      chosen.map((r) => ({
        id: r.id,
        entry: r.known
          ? null
          : {
              id: r.id,
              name: r.id,
              element: r.meta.element,
              weapon: r.meta.weapon,
              rarity: r.meta.rarity,
              region: "—",
            },
        progress: r.progress,
      }))
    );
    // Leave the modal open if nothing was actually written, rather than closing
    // as though the import had gone through.
    if (applied) onClose();
  };

  return (
    <div className="overlay" {...dismiss}>
      <div
        className="sheet enka"
        role="dialog"
        aria-modal="true"
        aria-label="Import characters from Enka.Network"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="add-head">
          <strong>Import from Enka.Network</strong>
          <button className="x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="enka-body">
          <p className="enka-intro">
            Reads the characters on your in-game profile showcase, up to eight. Switch on “Show
            character details” in the profile first, or there is nothing to read.
          </p>

          <form
            className="enka-form"
            onSubmit={(ev) => {
              ev.preventDefault();
              e.fetchProfile();
            }}
          >
            <input
              className="set-input wide"
              value={e.uid}
              onChange={(ev) => {
                e.setUid(ev.target.value);
                if (e.status !== "idle") e.reset();
              }}
              placeholder="Nine-digit UID or profile link"
              aria-label="Genshin UID or profile link"
              autoFocus
            />
            <button
              className="btn-primary"
              type="submit"
              disabled={loading || e.status === "loading"}
            >
              {e.status === "loading" ? "Reading…" : "Look up"}
            </button>
          </form>

          {e.status === "error" && <p className="warn">{e.error}</p>}

          {e.status === "ready" && e.rows.length === 0 && (
            <p className="enka-found">
              {e.nickname ? `${e.nickname}, ` : ""}
              every showcased character is newer than the roster data. Run npm run sync:data to pick
              them up.
            </p>
          )}

          {e.status === "ready" && e.rows.length > 0 && (
            <>
              <p className="enka-found">
                {e.nickname ? `${e.nickname}, ` : ""}
                {e.rows.length} character{e.rows.length === 1 ? "" : "s"} in the showcase.
                {e.unknown > 0 &&
                  ` ${e.unknown} more are newer than the roster data, so run npm run sync:data to pick them up.`}
              </p>

              <ul className="enka-rows">
                {e.rows.map((r) => (
                  <li key={r.id} style={{ "--el": ELEMENTS[r.meta.element].color }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!e.picked[r.id]}
                        onChange={() => e.toggle(r.id)}
                      />
                      <span className="enka-name">
                        <ElementIcon element={r.meta.element} size={13} />
                        {r.id}
                        {!r.tracked && <span className="enka-tag">new</span>}
                      </span>
                      <span className="enka-summary">{summary(r.progress)}</span>
                    </label>
                  </li>
                ))}
              </ul>

              <p className="enka-note">
                Overwrites talent levels, artifact set names and current stats. Your targets,
                reshape flags and complete marks stay as they are.
              </p>

              <button className="btn-primary wide" disabled={chosen.length === 0} onClick={apply}>
                Import {chosen.length} character{chosen.length === 1 ? "" : "s"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
