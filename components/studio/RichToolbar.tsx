"use client";
import type { Editor } from "@tiptap/core";
import { Bold, Heading3, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline, Unlink } from "lucide-react";
import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { RICH_TOOLBAR_ATTR, richStore } from "../edit/RichField";

type Position = { top: number; left: number };

function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return "";
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

/** Floating formatting bar for whichever rich-text field is being edited. */
export function RichToolbar() {
  const { editor, linkRequests } = useSyncExternalStore(richStore.subscribe, richStore.get, richStore.get);
  const [position, setPosition] = useState<Position | null>(null);
  const [linking, setLinking] = useState(false);
  const [url, setUrl] = useState("");
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const bar = useRef<HTMLDivElement>(null);

  // Follow the field and refresh button states as the selection changes.
  useEffect(() => {
    if (!editor) return;
    const place = () => {
      const rect = editor.view.dom.getBoundingClientRect();
      const height = bar.current?.offsetHeight ?? 44;
      const width = bar.current?.offsetWidth ?? 360;
      const top = rect.top - height - 10 < 64 ? rect.bottom + 10 : rect.top - height - 10;
      setPosition({ top, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) });
    };
    const onTransaction = () => {
      place();
      rerender();
    };
    place();
    editor.on("transaction", onTransaction);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      editor.off("transaction", onTransaction);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [editor]);

  // ⌘K from inside the field opens the link input.
  const lastRequest = useRef(linkRequests);
  useEffect(() => {
    if (linkRequests === lastRequest.current || !editor) return;
    lastRequest.current = linkRequests;
    setUrl(editor.getAttributes("link").href ?? "");
    setLinking(true);
  }, [linkRequests, editor]);

  if (!editor || !position) return null;

  const run = (command: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => command(editor.chain().focus()).run();
  const startLink = () => {
    setUrl(editor.getAttributes("link").href ?? "");
    setLinking(true);
  };
  const applyLink = () => {
    const href = normalizeUrl(url);
    setLinking(false);
    if (!href) return run((c) => c.extendMarkRange("link").unsetLink());
    if (editor.state.selection.empty && !editor.isActive("link")) {
      const text = href.replace(/^mailto:/, "");
      return run((c) => c.insertContent({ type: "text", text, marks: [{ type: "link", attrs: { href } }] }));
    }
    run((c) => c.extendMarkRange("link").setLink({ href }));
  };

  const button = (label: string, icon: React.ReactNode, action: () => void, active = false) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      {icon}
    </button>
  );

  return (
    <div
      ref={bar}
      className="st-rich-toolbar"
      style={{ top: position.top, left: position.left }}
      role="toolbar"
      aria-label="Text formatting"
      {...{ [RICH_TOOLBAR_ATTR]: "" }}
      onBlur={(event) => {
        // Leaving both the toolbar and its field ends the editing session.
        const next = event.relatedTarget as Node | null;
        if (bar.current?.contains(next) || editor.view.dom.contains(next)) return;
        setLinking(false);
        richStore.release(editor);
      }}
    >
      {linking ? (
        <form
          className="st-rich-link"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setLinking(false);
                editor.commands.focus();
              }
            }}
            placeholder="Paste a URL, page path, or email"
            aria-label="Link address"
          />
          <button type="submit">Apply</button>
          <button
            type="button"
            onClick={() => {
              setLinking(false);
              editor.commands.focus();
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          {button("Bold (⌘B)", <Bold />, () => run((c) => c.toggleBold()), editor.isActive("bold"))}
          {button("Italic (⌘I)", <Italic />, () => run((c) => c.toggleItalic()), editor.isActive("italic"))}
          {button("Underline (⌘U)", <Underline />, () => run((c) => c.toggleUnderline()), editor.isActive("underline"))}
          <span className="st-sep" />
          {button("Subheading", <Heading3 />, () => run((c) => c.toggleHeading({ level: 3 })), editor.isActive("heading", { level: 3 }))}
          {button("Bulleted list", <List />, () => run((c) => c.toggleBulletList()), editor.isActive("bulletList"))}
          {button("Numbered list", <ListOrdered />, () => run((c) => c.toggleOrderedList()), editor.isActive("orderedList"))}
          <span className="st-sep" />
          {button("Link (⌘K)", <Link2 />, startLink, editor.isActive("link"))}
          {editor.isActive("link") && button("Remove link", <Unlink />, () => run((c) => c.extendMarkRange("link").unsetLink()))}
          {button("Clear formatting", <RemoveFormatting />, () => run((c) => c.unsetAllMarks().clearNodes()))}
        </>
      )}
    </div>
  );
}
