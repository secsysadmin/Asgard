// Scrolls to an in-page anchor, opening it first if it's a collapsed FAQ answer.

export function revealHash(hash: string) {
  let id = hash.replace(/^#/, "");
  try {
    id = decodeURIComponent(id);
  } catch {
    // Malformed escape sequence: look the raw value up instead.
  }
  const el = id ? document.getElementById(id) : null;
  if (!el) return;
  if (el instanceof HTMLDetailsElement) el.open = true;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (el instanceof HTMLDetailsElement) el.querySelector("summary")?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  // Images above the target can finish loading after the jump and push it
  // down; keep it aligned until the page settles or the reader scrolls.
  let settled = false;
  const stop = () => {
    settled = true;
    observer.disconnect();
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchmove", stop);
    window.removeEventListener("keydown", stop);
  };
  let first = true; // ResizeObserver reports once on observe; skip it.
  const observer = new ResizeObserver(() => {
    if (first) first = false;
    else if (!settled) el.scrollIntoView({ block: "start" });
  });
  observer.observe(document.body);
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchmove", stop, { passive: true });
  window.addEventListener("keydown", stop);
  window.setTimeout(stop, 2500);
}
