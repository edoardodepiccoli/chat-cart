import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  "button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex='-1'])";

// While open: focus starts on the selected option (else the first control),
// Tab stays inside the dialog, Escape closes it, and on close focus goes
// back to the element that opened it.
export function useDialog(
  dialogRef: RefObject<HTMLElement>,
  open: boolean,
  onClose: () => void,
  returnRef: RefObject<HTMLElement>,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const opener = returnRef.current;
    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));

    const frame = requestAnimationFrame(() => {
      const start =
        dialog.querySelector<HTMLElement>(
          '[aria-pressed="true"]:not(:disabled)',
        ) ?? focusables()[0];
      start?.focus({ preventScroll: true });
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !dialog.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      opener?.focus({ preventScroll: true });
    };
  }, [open, dialogRef, returnRef]);
}
