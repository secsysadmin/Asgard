const SETTLE_TIMEOUT_MS = 2500;

type FocusVisibleOptions = FocusOptions & { focusVisible?: boolean };
const SUMMARY_FOCUS: FocusVisibleOptions = { preventScroll: true, focusVisible: false };

export function decodeHash(hash: string) {
  const raw = hash.replace(/^#/, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function onReaderScroll(listener: () => void) {
  window.addEventListener("wheel", listener, { passive: true });
  window.addEventListener("touchmove", listener, { passive: true });
  window.addEventListener("keydown", listener);
  return () => {
    window.removeEventListener("wheel", listener);
    window.removeEventListener("touchmove", listener);
    window.removeEventListener("keydown", listener);
  };
}

function keepAlignedWhilePageSettles(el: HTMLElement) {
  let settled = false;
  let skippedInitialReport = false;
  const observer = new ResizeObserver(() => {
    if (!skippedInitialReport) skippedInitialReport = true;
    else if (!settled) el.scrollIntoView({ block: "start" });
  });
  const stop = () => {
    settled = true;
    observer.disconnect();
    stopListening();
  };
  observer.observe(document.body);
  const stopListening = onReaderScroll(stop);
  window.setTimeout(stop, SETTLE_TIMEOUT_MS);
}

export function revealHash(hash: string) {
  const id = decodeHash(hash);
  const el = id ? document.getElementById(id) : null;
  if (!el) return;
  if (el instanceof HTMLDetailsElement) el.open = true;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (el instanceof HTMLDetailsElement) el.querySelector("summary")?.focus(SUMMARY_FOCUS);
  keepAlignedWhilePageSettles(el);
}
