import { useState } from "react";
import { ELEMENTS } from "../data/elements.js";

// Load the official sigil from the external host. If it fails, show an element-colored dot.
// Unknown elements render an empty dot because ELEMENTS has no matching color. The build
// source does not provide sigil assets.
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
