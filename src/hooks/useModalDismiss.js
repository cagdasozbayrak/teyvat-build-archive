import { useEffect, useRef } from "react";

// Shared modal dismissal behaviour:
// - Escape closes the modal.
// - A backdrop click closes only when the press STARTED on the overlay itself,
//   so selecting text inside a field and releasing on the backdrop doesn't
//   close (and discard edits).
// Returns props to spread on the overlay element.
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
