import { useState } from "react";
import { ELEMENTS } from "../data/elements.js";

// Official element sigil, falling back to a dot in the element color when the image fails
// to load (offline, or the CDN moved). An unknown element skips the image and renders the
// dot with no background at all, since ELEMENTS has no entry to color it with and .dot
// declares none, so it comes out as an empty gap. This host stays even though
// roster and portrait data moved to the build source, which ships no sigil assets.
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
