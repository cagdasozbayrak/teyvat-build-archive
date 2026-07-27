import { useState, useMemo } from "react";
import { ELEMENTS, ELEMENT_LIST, WEAPON_LIST } from "../data/elements.js";
import { useModalDismiss } from "../hooks/useModalDismiss.js";
import WeaponIcon from "./WeaponIcon.jsx";

export default function AddModal({ roster, owned, onAdd, onAddCustom, onClose }) {
  const dismiss = useModalDismiss(onClose);
  const [tab, setTab] = useState("pick");
  const [q, setQ] = useState("");
  const [ef, setEf] = useState(null);

  const list = useMemo(
    () =>
      roster
        .filter((c) => !owned[c.id])
        .filter((c) => (ef ? c.element === ef : true))
        .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name)),
    [roster, owned, ef, q]
  );

  // Custom character form.
  const [cn, setCn] = useState("");
  const [ce, setCe] = useState("Anemo");
  const [cw, setCw] = useState("Sword");
  const [cr, setCr] = useState(5);
  const nameTaken = roster.some((c) => c.id.toLowerCase() === cn.trim().toLowerCase());
  const canSave = cn.trim().length > 0 && !nameTaken;

  return (
    <div className="overlay" {...dismiss}>
      <div
        className="sheet add"
        role="dialog"
        aria-modal="true"
        aria-label="Add a character to your archive"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-head">
          <div className="tabs">
            <button className={tab === "pick" ? "on" : ""} onClick={() => setTab("pick")}>
              From roster
            </button>
            <button className={tab === "custom" ? "on" : ""} onClick={() => setTab("custom")}>
              New character
            </button>
          </div>
          <button className="x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {tab === "pick" && (
          <>
            <div className="add-tools">
              <input
                className="search"
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
              <div className="elem-chips">
                <button className={"chip" + (!ef ? " on" : "")} onClick={() => setEf(null)}>
                  All
                </button>
                {ELEMENT_LIST.map((el) => (
                  <button
                    key={el}
                    className={"chip" + (ef === el ? " on" : "")}
                    style={
                      ef === el
                        ? { borderColor: ELEMENTS[el].color, color: ELEMENTS[el].color }
                        : {}
                    }
                    onClick={() => setEf(ef === el ? null : el)}
                  >
                    <span className="dot" style={{ background: ELEMENTS[el].color }} />
                    {el}
                  </button>
                ))}
              </div>
            </div>
            <div className="pick-grid">
              {list.length === 0 && (
                <p className="pick-empty">Everyone here is already in your archive.</p>
              )}
              {list.map((c) => (
                <button
                  key={c.id}
                  className="pick-cell"
                  onClick={() => onAdd(c.id)}
                  style={{ "--el": ELEMENTS[c.element].color }}
                >
                  <span className="pick-glyph" style={{ color: ELEMENTS[c.element].color }}>
                    {c.name.slice(0, 1)}
                  </span>
                  <span className="pick-name">{c.name}</span>
                  <span className="pick-meta">
                    <span className="dot" style={{ background: ELEMENTS[c.element].color }} />
                    <WeaponIcon type={c.weapon} size={12} color="#8a93a6" />
                    <span className="pick-rare">{c.rarity}★</span>
                  </span>
                  <span className="pick-add">+</span>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "custom" && (
          <div className="custom-form">
            <p className="custom-intro">
              Genshin keeps adding characters — drop a new one in here the day it releases.
            </p>
            <label>
              Name
              <input
                className="set-input wide"
                value={cn}
                onChange={(e) => setCn(e.target.value)}
                placeholder="Character name"
                autoFocus
              />
            </label>
            {nameTaken && <p className="warn">That name is already in the roster.</p>}
            <label>
              Element
              <div className="opt-row">
                {ELEMENT_LIST.map((el) => (
                  <button
                    key={el}
                    className={"opt-btn" + (ce === el ? " on" : "")}
                    style={
                      ce === el
                        ? { borderColor: ELEMENTS[el].color, color: ELEMENTS[el].color }
                        : {}
                    }
                    onClick={() => setCe(el)}
                  >
                    <span className="dot" style={{ background: ELEMENTS[el].color }} />
                    {el}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Weapon
              <div className="opt-row">
                {WEAPON_LIST.map((w) => (
                  <button
                    key={w}
                    className={"opt-btn" + (cw === w ? " on" : "")}
                    onClick={() => setCw(w)}
                  >
                    <WeaponIcon type={w} size={13} color={cw === w ? "#e6c368" : "#9aa4b6"} />
                    {w}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Rarity
              <div className="opt-row">
                {[5, 4].map((r) => (
                  <button
                    key={r}
                    className={"opt-btn" + (cr === r ? " on" : "")}
                    onClick={() => setCr(r)}
                  >
                    {r}★
                  </button>
                ))}
              </div>
            </label>
            <button
              className="btn-primary wide"
              disabled={!canSave}
              onClick={() => {
                onAddCustom({
                  id: cn.trim(),
                  name: cn.trim(),
                  element: ce,
                  weapon: cw,
                  rarity: cr,
                  region: "—",
                });
                onClose();
              }}
            >
              Add to archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
