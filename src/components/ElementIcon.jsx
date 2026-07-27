import { useState } from "react";
import { ELEMENTS } from "../data/elements.js";

// Official element sigil from genshin.gg's CDN; falls back to the element-colored
// dot if the image fails (offline, unknown element, or CDN change).
const ICON_BASE = "https://sunderarmor.com/GENSHIN/Elements/Element_";

export default function ElementIcon({ element, size = 14 }) {
  const [failed, setFailed] = useState(false);
  const color = ELEMENTS[element]?.color;
  if (failed || !color) {
    return <span className="dot" style={{ background: color, width: size, height: size }} />;
  }
  return (
    <img
      className="el-icon"
      src={`${ICON_BASE}${element}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
