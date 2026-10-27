"use client";
import { Extension, type Editor } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import type { EditorView } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { safeHref, sanitizeHtml } from "@/lib/sanitize";
import type { Path } from "@/lib/studio/paths";
import { cx } from "./classNames";
import type { EditApi } from "./context";

type RichState = { editor: Editor | null; linkRequests: number };
type Point = { left: number; top: number };
type Activation = { click: Point | null };
type Props = { value: string; path: Path; className?: string; placeholder: string; edit: EditApi };
type ActiveProps = Props & Activation;

export const RICH_TOOLBAR_ATTR = "data-rich-toolbar";
const BARE_DOMAIN = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/i;

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
  requestLink: () => emit({ ...state, linkRequests: state.linkRequests + 1 }),
};

const isAllowedLink = (url: string) => !!safeHref(url) || BARE_DOMAIN.test(url);

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

const SanitizerFormatting = StarterKit.configure({
  heading: { levels: [3] },
  blockquote: false,
  code: false,
  codeBlock: false,
  horizontalRule: false,
  strike: false,
  link: { openOnClick: false, autolink: true, defaultProtocol: "https", isAllowedUri: isAllowedLink },
});

// The studio's CSS zoom breaks ProseMirror's scroll math; native scrollIntoView accounts for it.
function scrollSelectionIntoView(view: EditorView) {
  const { node } = view.domAtPos(view.state.selection.head);
  const element = node instanceof Element ? node : node.parentElement;
  element?.scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}

export function RichField(props: Props) {
  const [activation, setActivation] = useState<Activation | null>(null);
  const lastClick = useRef<Point | null>(null);
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
        lastClick.current = { left: event.clientX, top: event.clientY };
      }}
      onFocus={() => setActivation({ click: lastClick.current })}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(props.value) }}
    />
  );
}

function useCaretAtClick(editor: Editor | null, click: Point | null) {
  const placed = useRef(false);
  useEffect(() => {
    if (!editor || placed.current) return;
    placed.current = true;
    const frame = requestAnimationFrame(() => {
      // Focusing an editor whose DOM is not yet attached silently fails.
      if (!editor.view.dom.isConnected) return;
      const position = click ? editor.view.posAtCoords(click)?.pos : undefined;
      editor.commands.focus(position ?? "end", { scrollIntoView: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, click]);
}

function useSyncOutsideEdits(editor: Editor | null, value: string) {
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const incoming = sanitizeHtml(value);
    if (incoming !== sanitizeHtml(editor.getHTML())) editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, value]);
}

function useReleaseOnUnmount(editor: Editor | null) {
  useEffect(() => () => {
    if (editor) richStore.release(editor);
  }, [editor]);
}

function ActiveRichField({ value, path, className, placeholder, edit, click }: ActiveProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [SanitizerFormatting, Placeholder.configure({ placeholder }), StudioShortcuts],
    content: sanitizeHtml(value),
    editorProps: {
      handleScrollToSelection: scrollSelectionIntoView,
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
      const next = event.relatedTarget;
      if (!(next instanceof Element && next.closest(`[${RICH_TOOLBAR_ATTR}]`))) richStore.release(editor);
    },
  });

  useCaretAtClick(editor, click);
  useSyncOutsideEdits(editor, value);
  useReleaseOnUnmount(editor);

  return <EditorContent editor={editor} className="ed-rich-host" />;
}
