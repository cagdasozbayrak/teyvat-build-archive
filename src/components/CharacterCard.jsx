import { ELEMENTS } from "../data/elements.js";
import { ITEMS_PER_CHAR } from "../data/tracking.js";
import { portraitCandidates } from "../data/portraits.js";
import { countDone } from "../lib/progress.js";
import Portrait from "./Portrait.jsx";
import WeaponIcon from "./WeaponIcon.jsx";
import ElementIcon from "./ElementIcon.jsx";

export default function CharacterCard({ character, progress, onOpen, onRequestRemove }) {
  const el = ELEMENTS[character.element];
  const done = countDone(progress);
  const full = done === ITEMS_PER_CHAR;
  const pct = Math.round((done / ITEMS_PER_CHAR) * 100);
  return (
    <button
      className="card"
      onClick={onOpen}
      title="Open · right-click to remove"
      onContextMenu={(e) => {
        e.preventDefault();
        onRequestRemove();
      }}
      style={{ "--el": el.color, "--el-soft": el.soft }}
    >
      <div className="card-aura" />
      <div className="card-portrait">
        <Portrait
          srcs={progress.img ? [progress.img] : portraitCandidates(character)}
          name={character.name}
          color={el.color}
        />
      </div>
      <div className="card-name">{character.name}</div>
      <div className="card-meta">
        <span className="el-tag" style={{ color: el.color }}>
          <ElementIcon element={character.element} size={15} />
          {character.element}
        </span>
        <span className="wpn">
          <WeaponIcon type={character.weapon} color="#9aa4b6" />
          {character.weapon}
        </span>
      </div>
      <div className={"card-progress" + (full ? " done" : "")}>
        <span className="prog-track">
          <span className="prog-fill" style={{ width: `${pct}%` }} />
        </span>
        <span className="prog-label">
          {done}/{ITEMS_PER_CHAR}
        </span>
      </div>
    </button>
  );
}
