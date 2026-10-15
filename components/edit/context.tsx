"use client";
import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowDown, ArrowUp, Copy, GripVertical, ImagePlus, Link2, Plus, Trash2 } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import type { ImageRef, LinkRef } from "@/lib/content/types";

export type Path = (string | number)[];

/** Operations the studio exposes to editable regions of the rendered page. */
export type EditApi = {
  set(path: Path, value: unknown): void;
  insertItem(listPath: Path, index: number): void;
  removeItem(listPath: Path, index: number): void;
  moveItem(listPath: Path, from: number, to: number): void;
  duplicateItem(listPath: Path, index: number): void;
  pickImage(path: Path, current: ImageRef): void;
  /** Upload a file dropped straight onto an image and use it there. */
  dropImage(path: Path, file: File, current: ImageRef): void;
  editLink(path: Path, current: LinkRef): void;
};

const EditContext = createContext<EditApi | null>(null);
export const EditProvider = EditContext.Provider;
export const useEdit = () => useContext(EditContext);

const cx = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(" ");

type TagName = keyof React.JSX.IntrinsicElements;

/* ─────────────────────────────── Plain text ─────────────────────────────── */

export function Text({
  value,
  path,
  as = "span",
  className,
  placeholder = "Type here",
  multiline = false,
}: {
  value: string;
  path: Path;
  as?: TagName;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const edit = useEdit();
  const Tag = as as "span";
  if (!edit) return value ? <Tag className={className}>{value}</Tag> : null;
  return <EditableText {...{ value, path, Tag, className, placeholder, multiline, edit }} />;
}

function EditableText({
  value,
  path,
  Tag,
  className,
  placeholder,
  multiline,
  edit,
}: {
  value: string;
  path: Path;
  Tag: "span";
  className?: string;
  placeholder: string;
  multiline: boolean;
  edit: EditApi;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // The element is uncontrolled while focused so the caret never jumps.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value]);
  return (
    <Tag
      ref={ref}
      className={cx(className, "ed-text")}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-label={placeholder}
      data-placeholder={placeholder}
      onInput={(event) => edit.set(path, event.currentTarget.innerText.replace(/\n$/, ""))}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !multiline) {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") event.currentTarget.blur();
      }}
    />
  );
}

/* ─────────────────────────────── Rich text ─────────────────────────────── */

export function Rich({
  value,
  path,
  className,
  placeholder = "Write something…",
}: {
  value: string;
  path: Path;
  className?: string;
  placeholder?: string;
}) {
  const edit = useEdit();
  if (!edit) {
    const html = sanitizeHtml(value);
    return html ? <div className={cx("rich", className)} dangerouslySetInnerHTML={{ __html: html }} /> : null;
  }
  return <EditableRich {...{ value, path, className, placeholder, edit }} />;
}

function EditableRich({
  value,
  path,
  className,
  placeholder,
  edit,
}: {
  value: string;
  path: Path;
  className?: string;
  placeholder: string;
  edit: EditApi;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== value) el.innerHTML = sanitizeHtml(value);
  }, [value]);
  return (
    <div
      ref={ref}
      className={cx("rich", className, "ed-rich")}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline
      aria-label={placeholder}
      data-placeholder={placeholder}
      data-rich
      onFocus={() => document.execCommand("defaultParagraphSeparator", false, "p")}
      onInput={(event) => {
        const html = event.currentTarget.innerHTML;
        edit.set(path, event.currentTarget.textContent?.trim() || /<(li|br)/.test(html) ? html : "");
      }}
      onPaste={(event) => {
        event.preventDefault();
        const html = event.clipboardData.getData("text/html");
        const text = event.clipboardData.getData("text/plain");
        if (html) document.execCommand("insertHTML", false, sanitizeHtml(html));
        else document.execCommand("insertText", false, text);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.currentTarget.blur();
      }}
    />
  );
}

/* ──────────────────────────────── Images ──────────────────────────────── */

export function Img({
  value,
  path,
  className,
  frameClassName,
  zoom = false,
  loading = "lazy",
}: {
  value: ImageRef;
  path: Path;
  className?: string;
  frameClassName?: string;
  zoom?: boolean;
  loading?: "lazy" | "eager";
}) {
  const edit = useEdit();
  const [open, setOpen] = useState(false);
  if (!edit) {
    if (!value.src) return null;
    const image = <img className={className} src={value.src} alt={value.alt} loading={loading} decoding="async" />;
    if (!zoom) return frameClassName ? <span className={frameClassName}>{image}</span> : image;
    return (
      <>
        <button type="button" className={cx("zoomable", frameClassName)} onClick={() => setOpen(true)} aria-label={`Enlarge image: ${value.alt}`}>
          {image}
          <span className="zoom-hint" aria-hidden>Click to enlarge</span>
        </button>
        {open && <Lightbox image={value} onClose={() => setOpen(false)} />}
      </>
    );
  }
  return (
    <span
      className={cx("ed-img", frameClassName, !value.src && "ed-img-empty")}
      title="Drop an image here to replace it"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add("ed-img-drop");
      }}
      onDragLeave={(event) => event.currentTarget.classList.remove("ed-img-drop")}
      onDrop={(event) => {
        const file = event.dataTransfer.files[0];
        event.currentTarget.classList.remove("ed-img-drop");
        if (!file) return;
        event.preventDefault();
        event.stopPropagation();
        edit.dropImage(path, file, value);
      }}
    >
      {value.src ? <img className={className} src={value.src} alt={value.alt} /> : <span className="ed-img-placeholder"><ImagePlus /> Add image</span>}
      <button
        type="button"
        className="ed-img-button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          edit.pickImage(path, value);
        }}
      >
        <ImagePlus /> {value.src ? "Replace image" : "Choose image"}
      </button>
    </span>
  );
}

function Lightbox({ image, onClose }: { image: ImageRef; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="lightbox" onClose={onClose} onClick={(event) => event.target === ref.current && ref.current?.close()}>
      <img src={image.src} alt={image.alt} />
      <div className="lightbox-bar">
        <span>{image.alt}</span>
        <a href={image.src} target="_blank" rel="noopener noreferrer">Open full size</a>
        <button type="button" onClick={() => ref.current?.close()} autoFocus>Close</button>
      </div>
    </dialog>
  );
}

/* ──────────────────────────────── Links ──────────────────────────────── */

const isExternal = (href: string) => /^https?:/i.test(href);

export function Lnk({
  value,
  path,
  className,
  children,
  placeholder = "Link text",
}: {
  value: LinkRef;
  path: Path;
  className?: string;
  children?: ReactNode;
  placeholder?: string;
}) {
  const edit = useEdit();
  if (!edit) {
    if (!value.label || !value.href) return null;
    return (
      <a className={className} href={value.href} {...(isExternal(value.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {value.label}
        {children}
      </a>
    );
  }
  return (
    <span className={cx(className, "ed-link")}>
      <Text value={value.label} path={[...path, "label"]} placeholder={placeholder} />
      {children}
      <button
        type="button"
        className={cx("ed-link-button", !value.href && "ed-link-missing")}
        title={value.href ? `Links to ${value.href}` : "Set where this link goes"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          edit.editLink(path, value);
        }}
      >
        <Link2 />
        <span>{value.href ? "Edit link" : "Add link"}</span>
      </button>
    </span>
  );
}

/** A plain href attached to a non-link element (schedule rows, key dates). */
export function MaybeLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const edit = useEdit();
  if (!href || edit) return <span className={className}>{children}</span>;
  return (
    <a className={className} href={href} {...(isExternal(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/* ──────────────────────────────── Lists ──────────────────────────────── */

export function List<T>({
  items,
  path,
  render,
  as = "div",
  className,
  label = "item",
  min = 0,
}: {
  items: T[];
  path: Path;
  render: (item: T, index: number, at: Path) => ReactElement;
  as?: TagName;
  className?: string;
  label?: string;
  min?: number;
}) {
  const edit = useEdit();
  const [armed, setArmed] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const Tag = as as "div";
  if (!edit) return <Tag className={className}>{items.map((item, i) => <Fragment key={i}>{render(item, i, [...path, i])}</Fragment>)}</Tag>;

  const isRow = as === "tbody";
  const rendered = items.map((item, i) => {
    const element = render(item, i, [...path, i]);
    if (!isValidElement<{ className?: string; children?: ReactNode }>(element)) return element;
    const controls = (
      <span className="ed-item-tools" contentEditable={false} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="ed-grip" title={`Drag to reorder ${label}`} aria-label={`Drag ${label} ${i + 1}`} onPointerDown={() => setArmed(i)} onPointerUp={() => setArmed(null)}>
          <GripVertical />
        </button>
        <button type="button" title="Move earlier" aria-label={`Move ${label} ${i + 1} earlier`} disabled={i === 0} onClick={() => edit.moveItem(path, i, i - 1)}>
          <ArrowUp />
        </button>
        <button type="button" title="Move later" aria-label={`Move ${label} ${i + 1} later`} disabled={i === items.length - 1} onClick={() => edit.moveItem(path, i, i + 1)}>
          <ArrowDown />
        </button>
        <button type="button" title="Duplicate" aria-label={`Duplicate ${label} ${i + 1}`} onClick={() => edit.duplicateItem(path, i)}>
          <Copy />
        </button>
        <button type="button" title="Delete" aria-label={`Delete ${label} ${i + 1}`} disabled={items.length <= min} onClick={() => edit.removeItem(path, i)}>
          <Trash2 />
        </button>
      </span>
    );
    const dropping = drag && drag.over === i && drag.from !== i ? (drag.from < i ? "ed-drop-after" : "ed-drop-before") : null;
    return cloneElement(
      element,
      {
        key: i,
        className: cx(element.props.className, "ed-item", dropping, drag?.from === i && "ed-dragging"),
        draggable: armed === i,
        onDragStart: (event: React.DragEvent) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", `${label} ${i + 1}`);
          setDrag({ from: i, over: i });
        },
        onDragOver: (event: React.DragEvent) => {
          if (!drag) return;
          event.preventDefault();
          event.stopPropagation();
          if (drag.over !== i) setDrag({ ...drag, over: i });
        },
        onDrop: (event: React.DragEvent) => {
          if (!drag) return;
          event.preventDefault();
          event.stopPropagation();
          if (drag.from !== i) edit.moveItem(path, drag.from, i);
          setDrag(null);
          setArmed(null);
        },
        onDragEnd: () => {
          setDrag(null);
          setArmed(null);
        },
      } as Record<string, unknown>,
      ...Children.toArray(element.props.children),
      isRow ? <td key="tools" className="ed-row-tools">{controls}</td> : <Fragment key="tools">{controls}</Fragment>,
    );
  });

  const add = (
    <button type="button" className="ed-add" onClick={() => edit.insertItem(path, items.length)}>
      <Plus /> Add {label}
    </button>
  );
  return (
    <Tag className={cx(className, "ed-list")}>
      {rendered}
      {isRow ? (
        <tr className="ed-add-row">
          <td colSpan={99}>{add}</td>
        </tr>
      ) : (
        add
      )}
    </Tag>
  );
}
