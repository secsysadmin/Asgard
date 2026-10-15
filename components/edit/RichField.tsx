"use client";
import { Extension, type Editor } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { safeHref, sanitizeHtml } from "@/lib/sanitize";
import type { Path } from "@/lib/studio/paths";
import type { EditApi } from "./context";

const cx = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(" ");

/* ───────────── Which rich field is being edited (read by the toolbar) ───────────── */

type RichState = { editor: Editor | null; linkRequests: number };
let state: RichState = { editor: null, linkRequests: 0 };
const listeners = new Set<() => void>();
const emit = (next: RichState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const richStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  activate: (editor: Editor) => emit({ ...state, editor }),
  release: (editor: Editor) => state.editor === editor && emit({ ...state, editor: null }),
  /** ⌘K inside a field asks the toolbar to open its link input. */
  requestLink: () => emit({ ...state, linkRequests: state.linkRequests + 1 }),
};

/** Marks the toolbar so focusing it doesn't count as leaving the field. */
export const RICH_TOOLBAR_ATTR = "data-rich-toolbar";

const StudioShortcuts = Extension.create({
  name: "studioShortcuts",
  addKeyboardShortcuts() {
    return {
      "Mod-k": () => {
        richStore.requestLink();
        return true;
      },
      Escape: ({ editor }) => editor.commands.blur(),
    };
  },
});

/** Accept the same destinations the sanitizer allows, plus bare domains. */
const allowedLink = (url: string) => !!safeHref(url) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(url);

/* ───────────────────────────── The field ───────────────────────────── */

type Props = { value: string; path: Path; className?: string; placeholder: string; edit: EditApi };
type Point = { left: number; top: number };

/**
 * Shows sanitized HTML until it's focused, then swaps in a Tiptap editor with
 * the caret where the person clicked. Long pages stay fast because only the
 * fields someone actually edits create an editor.
 */
export function RichField(props: Props) {
  // Set on focus; holds where the person clicked so the caret can land there.
  const [activation, setActivation] = useState<{ click: Point | null } | null>(null);
  const click = useRef<Point | null>(null);
  if (activation) return <ActiveRichField {...props} click={activation.click} />;
  return (
    <div
      className={cx("rich", props.className, "ed-rich")}
      tabIndex={0}
      role="textbox"
      aria-multiline
      aria-label={props.placeholder}
      data-placeholder={props.placeholder}
      onMouseDown={(event) => {
        click.current = { left: event.clientX, top: event.clientY };
      }}
      onFocus={() => setActivation({ click: click.current })}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(props.value) }}
    />
  );
}

function ActiveRichField({ value, path, className, placeholder, edit, click }: Props & { click: Point | null }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Only what the public sanitizer keeps: paragraphs, bold/italic/underline,
        // links, lists, line breaks, and one subheading level.
        heading: { levels: [3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", isAllowedUri: allowedLink },
      }),
      Placeholder.configure({ placeholder }),
      StudioShortcuts,
    ],
    content: sanitizeHtml(value),
    editorProps: {
      // The studio shrinks wide previews with CSS zoom, which ProseMirror's own
      // scroll math doesn't account for. The browser's native scrollIntoView
      // does, so use it to keep the caret's line visible.
      handleScrollToSelection: (view) => {
        const { node } = view.domAtPos(view.state.selection.head);
        const element = node instanceof Element ? node : node.parentElement;
        element?.scrollIntoView({ block: "nearest", inline: "nearest" });
        return true;
      },
      attributes: {
        class: cx("rich", className, "ed-rich", "ed-rich-active"),
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": placeholder,
      },
    },
    onUpdate: ({ editor }) => edit.set(path, editor.isEmpty ? "" : editor.getHTML()),
    onFocus: ({ editor }) => richStore.activate(editor),
    onBlur: ({ editor, event }) => {
      const next = event.relatedTarget as HTMLElement | null;
      if (!next?.closest(`[${RICH_TOOLBAR_ATTR}]`)) richStore.release(editor);
    },
  });

  // Once the editor is on the page, put the caret where the person clicked.
  // (Before then its DOM is detached, so focusing would silently fail.)
  const placed = useRef(false);
  useEffect(() => {
    if (!editor || placed.current) return;
    placed.current = true;
    const frame = requestAnimationFrame(() => {
      if (!editor.view.dom.isConnected) return;
      const position = click ? editor.view.posAtCoords(click)?.pos : undefined;
      editor.commands.focus(position ?? "end", { scrollIntoView: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, click]);

  // Undo/redo or the inspector can change this field from outside.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const incoming = sanitizeHtml(value);
    if (incoming !== sanitizeHtml(editor.getHTML())) editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => () => {
    if (editor) richStore.release(editor);
  }, [editor]);

  return <EditorContent editor={editor} className="ed-rich-host" />;
}
