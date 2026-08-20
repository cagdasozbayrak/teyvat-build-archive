import { useState, useCallback } from "react";
import { ELEMENTS } from "../data/elements.js";
import { useModalDismiss } from "../hooks/useModalDismiss.js";
import { TALENTS, ARTIFACTS, STATS, ARTIFACT_SETS } from "../data/tracking.js";
import { TALENT_MAX } from "../lib/constants.js";
import { talentDone, statMet } from "../lib/progress.js";
import { portraitCandidates } from "../data/portraits.js";
import { buildPageUrl } from "../data/builds.js";
import Portrait from "./Portrait.jsx";
import WeaponIcon from "./WeaponIcon.jsx";
import ElementIcon from "./ElementIcon.jsx";
import Stepper from "./Stepper.jsx";

export default function DetailModal({ character, progress, actions, onRemove, onClose }) {
  const [applyAll, setApplyAll] = useState("");
  const el = ELEMENTS[character.element].color;
  const soft = ELEMENTS[character.element].soft;
  const id = character.id;

  // Commit any in-progress field edit before closing (Escape or backdrop).
  const close = useCallback(() => {
    actions.commitField();
    onClose();
  }, [actions, onClose]);
  const dismiss = useModalDismiss(close);

  const buildUrl = buildPageUrl(character);
  const metCount = STATS.filter((s) => statMet(progress.stats[s.key])).length;
  const trackedCount = STATS.filter((s) => progress.stats[s.key].target > 0).length;

  return (
    <div className="overlay" {...dismiss}>
      <div
        className="sheet detail"
        role="dialog"
        aria-modal="true"
        aria-label={`${character.name} build details`}
        onClick={(e) => e.stopPropagation()}
        style={{ "--el": el, "--el-soft": soft }}
      >
        <div className="detail-head">
          <div className="detail-portrait">
            <Portrait
              srcs={progress.img ? [progress.img] : portraitCandidates(character)}
              name={character.name}
              color={el}
            />
          </div>
          <div className="detail-title">
            <h2>{character.name}</h2>
            <div className="card-meta">
              <span className="el-tag" style={{ color: el }}>
                <ElementIcon element={character.element} size={16} />
                {character.element}
              </span>
              <span className="wpn">
                <WeaponIcon type={character.weapon} color="#9aa4b6" />
                {character.weapon}
              </span>
              {character.region !== "—" && <span className="region">{character.region}</span>}
            </div>
          </div>
          {buildUrl && (
            <a
              className="btn-ghost build-link"
              href={buildUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Build guide (opens in a new tab)"
            >
              Build guide <span aria-hidden="true">↗</span>
            </a>
          )}
          <button className="x" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="detail-body">
          {/* Talents */}
          <section>
            <h3>
              Talents <span className="opt">level {"\u2192"} target</span>
            </h3>
            {TALENTS.map((t) => {
              const tl = progress.talents[t.key];
              const on = talentDone(tl);
              const gap = tl.target - tl.lvl;
              return (
                <div key={t.key} className={"tal-row" + (on ? " done" : "")}>
                  <div className="tal-info">
                    <span className="row-label">{t.label}</span>
                    <span className="row-state">
                      {on ? "At target" : `${gap} level${gap === 1 ? "" : "s"} to go`}
                    </span>
                  </div>
                  <div className="tal-steppers">
                    <Stepper
                      label="Lv"
                      value={tl.lvl}
                      min={1}
                      max={TALENT_MAX}
                      accent={el}
                      onChange={(v) => actions.setTalent(id, t.key, { lvl: v })}
                    />
                    <Stepper
                      label="Target"
                      value={tl.target}
                      min={1}
                      max={TALENT_MAX}
                      onChange={(v) => actions.setTalent(id, t.key, { target: v })}
                    />
                  </div>
                </div>
              );
            })}
          </section>

          {/* Artifacts */}
          <section>
            <h3>Artifacts</h3>
            <datalist id="gbt-artifact-sets">
              {ARTIFACT_SETS.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="apply-all">
              <input
                className="set-input"
                list="gbt-artifact-sets"
                autoComplete="off"
                placeholder="Set the same set on all 5 pieces…"
                value={applyAll}
                onChange={(e) => setApplyAll(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") actions.setAllArtifactSets(id, applyAll);
                }}
              />
              <button
                className="apply-btn"
                disabled={!applyAll.trim()}
                onClick={() => actions.setAllArtifactSets(id, applyAll)}
              >
                Apply to all
              </button>
            </div>
            {ARTIFACTS.map((s) => {
              const a = progress.artifacts[s.key];
              const on = a.status === "complete";
              return (
                <div
                  key={s.key}
                  className={"art-row" + (on ? " done" : "") + (a.reshape ? " reshape" : "")}
                >
                  <button
                    className="row-check-btn"
                    onClick={() => actions.toggleArtifact(id, s.key)}
                    aria-label={on ? "Mark upgrade needed" : "Mark complete"}
                  >
                    <span className="row-check">{on ? "✓" : ""}</span>
                  </button>
                  <div className="art-main">
                    <span className="row-label">{s.label}</span>
                    <input
                      className="set-input"
                      placeholder="Artifact set…"
                      value={a.set}
                      list="gbt-artifact-sets"
                      autoComplete="off"
                      onChange={(e) => actions.setArtifactSet(id, s.key, e.target.value)}
                      onBlur={actions.commitField}
                    />
                  </div>
                  <button
                    className={"reshape-btn" + (a.reshape ? " on" : "")}
                    onClick={() => actions.toggleReshape(id, s.key)}
                    title="Plan to reshape this piece"
                    aria-pressed={a.reshape}
                  >
                    {"\u21BB"} Reshape
                  </button>
                  <button className="mini-state" onClick={() => actions.toggleArtifact(id, s.key)}>
                    {on ? "Complete" : "Upgrade"}
                  </button>
                </div>
              );
            })}
          </section>

          {/* Stats */}
          <section className="full">
            <h3>
              Stats{" "}
              <span className="opt">
                {trackedCount ? `${metCount}/${trackedCount} targets met` : "current → target"}
              </span>
            </h3>
            <div className="stat-grid">
              {STATS.map((s) => {
                const v = progress.stats[s.key];
                const met = statMet(v);
                return (
                  <div
                    key={s.key}
                    className={"stat-row" + (met ? " met" : "") + (v.target > 0 ? " tracked" : "")}
                  >
                    <span className="stat-name">{s.label}</span>
                    <div className="stat-fields">
                      <StatField
                        className="stat-input"
                        value={v.cur}
                        placeholder="0"
                        onCommit={(val) => actions.commitStat(id, s.key, "cur", val)}
                      />
                      <span className="stat-unit">{s.unit}</span>
                      <span className="stat-arrow">{"\u2192"}</span>
                      <StatField
                        className="stat-input target"
                        value={v.target}
                        placeholder="—"
                        onCommit={(val) => actions.commitStat(id, s.key, "target", val)}
                      />
                      <span className="stat-unit">{s.unit}</span>
                      <span className="stat-dot" aria-hidden>
                        {met ? "✓" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="hint">
              Enter current and target values. Leave a target blank (0) to skip a stat.
            </p>
          </section>

          {/* Portrait override */}
          <section className="full img-section">
            <h3>
              Portrait <span className="opt">auto by name</span>
            </h3>
            <input
              className="set-input wide"
              placeholder="Override with an image URL…"
              value={progress.img}
              onChange={(e) => actions.setImg(id, e.target.value)}
              onBlur={actions.commitField}
            />
            <p className="hint">
              Portraits load automatically from the character's name. Paste a URL here to override,
              or if the auto image doesn't show up.
            </p>
          </section>
        </div>

        <div className="detail-foot">
          <button className="btn-ghost danger" onClick={onRemove}>
            Remove from archive
          </button>
        </div>
      </div>
    </div>
  );
}

// A numeric field that keeps the raw typed string while focused (so partial
// values like "77." are preserved) and coerces to a number only on blur.
function StatField({ className, value, placeholder, onCommit }) {
  const [buf, setBuf] = useState(null);
  const shown = buf ?? (value || "");
  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={shown}
      placeholder={placeholder}
      onChange={(e) => setBuf(e.target.value.replace(/[^\d.]/g, ""))}
      onBlur={() => {
        if (buf !== null) onCommit(buf);
        setBuf(null);
      }}
    />
  );
}
