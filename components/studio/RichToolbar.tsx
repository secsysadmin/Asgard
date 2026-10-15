"use client";
import { Bold, Heading3, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline, Unlink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Position = { top: number; left: number };

const exec = (command: string, value?: string) => document.execCommand(command, false, value);

function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return "";
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

/** Floating formatting bar shown above whichever rich-text field has focus. */
export function RichToolbar() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [linking, setLinking] = useState(false);
  const [url, setUrl] = useState("");
  const [, refresh] = useState(0);
  const bar = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const el = (event.target as HTMLElement).closest?.<HTMLElement>("[data-rich]");
      if (el) setTarget(el);
      else if (!bar.current?.contains(event.target as Node)) {
        setTarget(null);
        setLinking(false);
      }
    };
    const onSelection = () => refresh((n) => n + 1);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("selectionchange", onSelection);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("selectionchange", onSelection);
    };
  }, []);

  useEffect(() => {
    if (!target) return setPosition(null);
    const place = () => {
      const rect = target.getBoundingClientRect();
      const height = bar.current?.offsetHeight ?? 44;
      const top = rect.top - height - 10 < 64 ? rect.bottom + 10 : rect.top - height - 10;
      setPosition({ top, left: Math.max(12, Math.min(rect.left, window.innerWidth - (bar.current?.offsetWidth ?? 360) - 12)) });
    };
    place();
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && document.activeElement === target) {
        event.preventDefault();
        startLink();
      }
    };
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    target.addEventListener("input", place);
    target.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      target.removeEventListener("input", place);
      target.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!target || !position) return null;

  const state = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };
  const inHeading = () => /h3/i.test(String(document.queryCommandValue("formatBlock")));
  const inLink = () => !!window.getSelection()?.anchorNode?.parentElement?.closest("a");

  function startLink() {
    const selection = window.getSelection();
    savedRange.current = selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    setUrl(selection?.anchorNode?.parentElement?.closest("a")?.getAttribute("href") ?? "");
    setLinking(true);
  }
  const applyLink = () => {
    const href = normalizeUrl(url);
    target.focus();
    const selection = window.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    if (!href) exec("unlink");
    else if (selection?.isCollapsed) exec("insertHTML", `<a href="${href.replace(/"/g, "&quot;")}">${href.replace(/^mailto:/, "").replace(/</g, "&lt;")}</a>`);
    else exec("createLink", href);
    setLinking(false);
  };

  const button = (label: string, icon: React.ReactNode, run: () => void, active = false) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={run}
    >
      {icon}
    </button>
  );

  return (
    <div ref={bar} className="st-rich-toolbar" style={{ top: position.top, left: position.left }} role="toolbar" aria-label="Text formatting">
      {linking ? (
        <form
          className="st-rich-link"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <input autoFocus value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste a URL, page path, or email" aria-label="Link address" />
          <button type="submit">Apply</button>
          <button type="button" onClick={() => { setLinking(false); target.focus(); }}>Cancel</button>
        </form>
      ) : (
        <>
          {button("Bold (⌘B)", <Bold />, () => exec("bold"), state("bold"))}
          {button("Italic (⌘I)", <Italic />, () => exec("italic"), state("italic"))}
          {button("Underline (⌘U)", <Underline />, () => exec("underline"), state("underline"))}
          <span className="st-sep" />
          {button("Subheading", <Heading3 />, () => exec("formatBlock", inHeading() ? "p" : "h3"), inHeading())}
          {button("Bulleted list", <List />, () => exec("insertUnorderedList"), state("insertUnorderedList"))}
          {button("Numbered list", <ListOrdered />, () => exec("insertOrderedList"), state("insertOrderedList"))}
          <span className="st-sep" />
          {button("Link (⌘K)", <Link2 />, startLink, inLink())}
          {inLink() && button("Remove link", <Unlink />, () => exec("unlink"))}
          {button("Clear formatting", <RemoveFormatting />, () => {
            exec("removeFormat");
            exec("formatBlock", "p");
          })}
        </>
      )}
    </div>
  );
}
