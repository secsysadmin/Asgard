"use client";
import type { Editor } from "@tiptap/core";
import { Bold, Heading3, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline, Unlink } from "lucide-react";
import { type ReactNode, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { RICH_TOOLBAR_ATTR, richStore } from "../edit/RichField";

type Position = { top: number; left: number };
type ToolButtonProps = { label: string; active?: boolean; onClick: () => void; children: ReactNode };
type ChainCommand = (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>;

const FALLBACK_HEIGHT = 44;
const FALLBACK_WIDTH = 360;
const FIELD_GAP = 10;
const TOP_BAR_CLEARANCE = 64;
const VIEWPORT_MARGIN = 12;
const SUBHEADING_LEVEL = 3;

function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return "";
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

function ToolButton({ label, active = false, onClick, children }: ToolButtonProps) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

export function RichToolbar() {
  const { editor, linkRequests } = useSyncExternalStore(richStore.subscribe, richStore.get, richStore.get);
  const [position, setPosition] = useState<Position | null>(null);
  const [linking, setLinking] = useState(false);
  const [url, setUrl] = useState("");
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;
    const place = () => {
      const rect = editor.view.dom.getBoundingClientRect();
      const height = bar.current?.offsetHeight ?? FALLBACK_HEIGHT;
      const width = bar.current?.offsetWidth ?? FALLBACK_WIDTH;
      const above = rect.top - height - FIELD_GAP;
      const top = above < TOP_BAR_CLEARANCE ? rect.bottom + FIELD_GAP : above;
      setPosition({ top, left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN)) });
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

  const lastRequest = useRef(linkRequests);
  useEffect(() => {
    if (linkRequests === lastRequest.current || !editor) return;
    lastRequest.current = linkRequests;
    setUrl(editor.getAttributes("link").href ?? "");
    setLinking(true);
  }, [linkRequests, editor]);

  if (!editor || !position) return null;

  const run = (command: ChainCommand) => command(editor.chain().focus()).run();
  const startLink = () => {
    setUrl(editor.getAttributes("link").href ?? "");
    setLinking(true);
  };
  const stopLinking = () => {
    setLinking(false);
    editor.commands.focus();
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

  return (
    <div
      ref={bar}
      className="st-rich-toolbar"
      style={{ top: position.top, left: position.left }}
      role="toolbar"
      aria-label="Text formatting"
      {...{ [RICH_TOOLBAR_ATTR]: "" }}
      onBlur={(event) => {
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
                stopLinking();
              }
            }}
            placeholder="Paste a URL, page path, or email"
            aria-label="Link address"
          />
          <button type="submit">Apply</button>
          <button type="button" onClick={stopLinking}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <ToolButton label="Bold (⌘B)" active={editor.isActive("bold")} onClick={() => run((c) => c.toggleBold())}>
            <Bold />
          </ToolButton>
          <ToolButton label="Italic (⌘I)" active={editor.isActive("italic")} onClick={() => run((c) => c.toggleItalic())}>
            <Italic />
          </ToolButton>
          <ToolButton label="Underline (⌘U)" active={editor.isActive("underline")} onClick={() => run((c) => c.toggleUnderline())}>
            <Underline />
          </ToolButton>
          <span className="st-sep" />
          <ToolButton
            label="Subheading"
            active={editor.isActive("heading", { level: SUBHEADING_LEVEL })}
            onClick={() => run((c) => c.toggleHeading({ level: SUBHEADING_LEVEL }))}
          >
            <Heading3 />
          </ToolButton>
          <ToolButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => run((c) => c.toggleBulletList())}>
            <List />
          </ToolButton>
          <ToolButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => run((c) => c.toggleOrderedList())}>
            <ListOrdered />
          </ToolButton>
          <span className="st-sep" />
          <ToolButton label="Link (⌘K)" active={editor.isActive("link")} onClick={startLink}>
            <Link2 />
          </ToolButton>
          {editor.isActive("link") && (
            <ToolButton label="Remove link" onClick={() => run((c) => c.extendMarkRange("link").unsetLink())}>
              <Unlink />
            </ToolButton>
          )}
          <ToolButton label="Clear formatting" onClick={() => run((c) => c.unsetAllMarks().clearNodes())}>
            <RemoveFormatting />
          </ToolButton>
        </>
      )}
    </div>
  );
}
