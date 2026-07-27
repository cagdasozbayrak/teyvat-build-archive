import { ELEMENTS, ELEMENT_LIST } from "../data/elements.js";

export default function Toolbar({ search, setSearch, elemFilter, setElemFilter, hideDone, setHideDone, onAdd }) {
  return (
    <div className="toolbar">
      <input className="search" placeholder="Search your roster…"
        value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="elem-chips">
        <button className={"chip" + (!elemFilter ? " on" : "")} onClick={() => setElemFilter(null)}>All</button>
        {ELEMENT_LIST.map((el) => (
          <button key={el} className={"chip" + (elemFilter === el ? " on" : "")}
            style={elemFilter === el ? { borderColor: ELEMENTS[el].color, color: ELEMENTS[el].color } : {}}
            onClick={() => setElemFilter(elemFilter === el ? null : el)}>
            <span className="dot" style={{ background: ELEMENTS[el].color }} />{el}
          </button>
        ))}
      </div>
      <button className={"chip toggle" + (hideDone ? " on" : "")}
        onClick={() => setHideDone((v) => !v)} aria-pressed={hideDone}>
        {hideDone ? "◑" : "◔"} {hideDone ? "Completed hidden" : "Hide completed"}
      </button>
      <button className="btn-primary" onClick={onAdd}>+ Add character</button>
    </div>
  );
}
