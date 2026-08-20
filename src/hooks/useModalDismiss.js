import { useEffect, useRef } from "react";

// Close on Escape or a click that starts and ends on the overlay. Requiring both mouse
// events prevents text selection released over the backdrop from discarding edits.
export function useModalDismiss(onDismiss) {
  const downOnOverlay = useRef(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return {
    onMouseDown: (e) => {
      downOnOverlay.current = e.target === e.currentTarget;
    },
    onClick: (e) => {
      if (e.target === e.currentTarget && downOnOverlay.current) onDismiss();
      downOnOverlay.current = false;
    },
  };
}
