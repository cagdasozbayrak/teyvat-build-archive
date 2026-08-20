import { useState, useEffect } from "react";

// Try `srcs` in order. If none load, show an element-colored initial.
export default function Portrait({ srcs, name, color }) {
  const [i, setI] = useState(0);
  const key = srcs.join("|");
  useEffect(() => {
    setI(0);
  }, [key]);

  const src = srcs[i];
  if (!src)
    return (
      <span className="portrait-glyph" style={{ color }}>
        {name.slice(0, 1)}
      </span>
    );
  return <img src={src} alt="" loading="lazy" onError={() => setI((n) => n + 1)} />;
}
