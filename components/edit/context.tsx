"use client";
import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowDown, ArrowUp, Copy, GripVertical, ImagePlus, Link2, Plus, Trash2 } from "lucide-react";
import { safeHref, sanitizeHtml } from "@/lib/sanitize";
import type { ImageRef, LinkRef } from "@/lib/content/types";
import type { Path } from "@/lib/studio/paths";
import { SmartLink } from "../site/SmartLink";
import { cx } from "./classNames";
import { RichField } from "./RichField";

export type { Path };

export type EditApi = {
  set(path: Path, value: unknown): void;
  insertItem(listPath: Path, index: number): void;
  removeItem(listPath: Path, index: number): void;
  moveItem(listPath: Path, from: number, to: number): void;
  duplicateItem(listPath: Path, index: number): void;
  pickImage(path: Path, current: ImageRef): void;
  dropImage(path: Path, file: File, current: ImageRef): void;
  editLink(path: Path, current: LinkRef): void;
};

type TagName = keyof React.JSX.IntrinsicElements;
type ItemElementProps = React.HTMLAttributes<HTMLElement>;
type DragState = { from: number; over: number };

type TextProps = {
  value: string;
  path: Path;
  as?: TagName;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
};
type EditableTextProps = {
  value: string;
  path: Path;
  Tag: "span";
  className?: string;
  placeholder: string;
  multiline: boolean;
  edit: EditApi;
};
type RichProps = { value: string; path: Path; className?: string; placeholder?: string };
type ImgProps = {
  value: ImageRef;
  path: Path;
  className?: string;
  frameClassName?: string;
  zoom?: boolean;
  loading?: "lazy" | "eager";
};
type ZoomableImageProps = { image: ReactNode; value: ImageRef; frameClassName?: string };
type EditableImgProps = { value: ImageRef; path: Path; className?: string; frameClassName?: string; edit: EditApi };
type LightboxProps = { image: ImageRef; onClose: () => void };
type LnkProps = { value: LinkRef; path: Path; className?: string; children?: ReactNode; placeholder?: string };
type MaybeLinkProps = { href: string; className?: string; children: ReactNode };
type ListProps<T> = {
  items: T[];
  path: Path;
  render: (item: T, index: number, at: Path) => ReactElement;
  as?: TagName;
  className?: string;
  label?: string;
  min?: number;
  containerProps?: React.HTMLAttributes<HTMLElement>;
};
type ItemToolsProps = {
  index: number;
  count: number;
  min: number;
  label: string;
  path: Path;
  edit: EditApi;
  onArm: (index: number | null) => void;
};

const DEFAULT_TEXT_PLACEHOLDER = "Type here";
const DEFAULT_RICH_PLACEHOLDER = "Write something…";
const DEFAULT_LINK_PLACEHOLDER = "Link text";
const FULL_ROW_SPAN = 99;

const EditContext = createContext<EditApi | null>(null);
export const EditProvider = EditContext.Provider;
export const useEdit = () => useContext(EditContext);

const stopEvent = (event: SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

export function Text({
  value,
  path,
  as = "span",
  className,
  placeholder = DEFAULT_TEXT_PLACEHOLDER,
  multiline = false,
}: TextProps) {
  const edit = useEdit();
  const Tag = as as "span";
  if (!edit) return value ? <Tag className={className}>{value}</Tag> : null;
  return <EditableText {...{ value, path, Tag, className, placeholder, multiline, edit }} />;
}

function EditableText({ value, path, Tag, className, placeholder, multiline, edit }: EditableTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const isBeingTyped = document.activeElement === el;
    if (el && !isBeingTyped && el.innerText !== value) el.innerText = value;
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

export function Rich({ value, path, className, placeholder = DEFAULT_RICH_PLACEHOLDER }: RichProps) {
  const edit = useEdit();
  if (!edit) {
    const html = sanitizeHtml(value);
    return html ? <div className={cx("rich", className)} dangerouslySetInnerHTML={{ __html: html }} /> : null;
  }
  return <RichField {...{ value, path, className, placeholder, edit }} />;
}

export function Img({ value, path, className, frameClassName, zoom = false, loading = "lazy" }: ImgProps) {
  const edit = useEdit();
  if (edit) return <EditableImg {...{ value, path, className, frameClassName, edit }} />;
  if (!value.src) return null;
  const image = (
    <img
      className={className}
      src={value.src}
      alt={value.alt}
      loading={loading}
      decoding="async"
      fetchPriority={loading === "eager" ? "high" : undefined}
    />
  );
  if (zoom) return <ZoomableImage {...{ image, value, frameClassName }} />;
  return frameClassName ? <span className={frameClassName}>{image}</span> : image;
}

function ZoomableImage({ image, value, frameClassName }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
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

function EditableImg({ value, path, className, frameClassName, edit }: EditableImgProps) {
  return (
    <span
      className={cx("ed-img", frameClassName, !value.src && "ed-img-empty")}
      title="Drop an image here to replace it"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        stopEvent(event);
        event.currentTarget.classList.add("ed-img-drop");
      }}
      onDragLeave={(event) => event.currentTarget.classList.remove("ed-img-drop")}
      onDrop={(event) => {
        const file = event.dataTransfer.files[0];
        event.currentTarget.classList.remove("ed-img-drop");
        if (!file) return;
        stopEvent(event);
        edit.dropImage(path, file, value);
      }}
    >
      {value.src ? <img className={className} src={value.src} alt={value.alt} /> : <span className="ed-img-placeholder"><ImagePlus /> Add image</span>}
      <button
        type="button"
        className="ed-img-button"
        onClick={(event) => {
          stopEvent(event);
          edit.pickImage(path, value);
        }}
      >
        <ImagePlus /> {value.src ? "Replace image" : "Choose image"}
      </button>
    </span>
  );
}

function Lightbox({ image, onClose }: LightboxProps) {
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

export function Lnk({ value, path, className, children, placeholder = DEFAULT_LINK_PLACEHOLDER }: LnkProps) {
  const edit = useEdit();
  if (!edit) {
    const href = safeHref(value.href);
    if (!value.label || !href) return null;
    return (
      <SmartLink className={className} href={href}>
        {value.label}
        {children}
      </SmartLink>
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
          stopEvent(event);
          edit.editLink(path, value);
        }}
      >
        <Link2 />
        <span>{value.href ? "Edit link" : "Add link"}</span>
      </button>
    </span>
  );
}

export function MaybeLink({ href, className, children }: MaybeLinkProps) {
  const edit = useEdit();
  const safe = safeHref(href);
  if (!safe || edit) return <span className={className}>{children}</span>;
  return (
    <SmartLink className={className} href={safe}>
      {children}
    </SmartLink>
  );
}

function dropClass(drag: DragState | null, index: number) {
  if (!drag || drag.over !== index || drag.from === index) return null;
  return drag.from < index ? "ed-drop-after" : "ed-drop-before";
}

function ItemTools({ index, count, min, label, path, edit, onArm }: ItemToolsProps) {
  const name = `${label} ${index + 1}`;
  return (
    <span className="ed-item-tools" contentEditable={false} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="ed-grip" title={`Drag to reorder ${label}`} aria-label={`Drag ${name}`} onPointerDown={() => onArm(index)} onPointerUp={() => onArm(null)}>
        <GripVertical />
      </button>
      <button type="button" title="Move earlier" aria-label={`Move ${name} earlier`} disabled={index === 0} onClick={() => edit.moveItem(path, index, index - 1)}>
        <ArrowUp />
      </button>
      <button type="button" title="Move later" aria-label={`Move ${name} later`} disabled={index === count - 1} onClick={() => edit.moveItem(path, index, index + 1)}>
        <ArrowDown />
      </button>
      <button type="button" title="Duplicate" aria-label={`Duplicate ${name}`} onClick={() => edit.duplicateItem(path, index)}>
        <Copy />
      </button>
      <button type="button" title="Delete" aria-label={`Delete ${name}`} disabled={count <= min} onClick={() => edit.removeItem(path, index)}>
        <Trash2 />
      </button>
    </span>
  );
}

export function List<T>({ items, path, render, as = "div", className, label = "item", min = 0, containerProps }: ListProps<T>) {
  const edit = useEdit();
  const [armed, setArmed] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const Tag = as as "div";
  if (!edit) return <Tag className={className} {...containerProps}>{items.map((item, i) => <Fragment key={i}>{render(item, i, [...path, i])}</Fragment>)}</Tag>;

  const isRow = as === "tbody";
  const endDrag = () => {
    setDrag(null);
    setArmed(null);
  };
  const dragHandlers = (i: number): ItemElementProps => ({
    draggable: armed === i,
    onDragStart: (event) => {
      event.stopPropagation();
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `${label} ${i + 1}`);
      setDrag({ from: i, over: i });
    },
    onDragOver: (event) => {
      if (!drag) return;
      stopEvent(event);
      if (drag.over !== i) setDrag({ ...drag, over: i });
    },
    onDrop: (event) => {
      if (!drag) return;
      stopEvent(event);
      if (drag.from !== i) edit.moveItem(path, drag.from, i);
      endDrag();
    },
    onDragEnd: endDrag,
  });

  const rendered = items.map((item, i) => {
    const element = render(item, i, [...path, i]);
    if (!isValidElement<ItemElementProps>(element)) return element;
    const tools = <ItemTools index={i} count={items.length} min={min} label={label} path={path} edit={edit} onArm={setArmed} />;
    return cloneElement(
      element,
      {
        key: i,
        className: cx(element.props.className, "ed-item", dropClass(drag, i), drag?.from === i && "ed-dragging"),
        ...dragHandlers(i),
      },
      ...Children.toArray(element.props.children),
      isRow ? <td key="tools" className="ed-row-tools">{tools}</td> : <Fragment key="tools">{tools}</Fragment>,
    );
  });

  const add = (
    <button type="button" className="ed-add" onClick={() => edit.insertItem(path, items.length)}>
      <Plus /> Add {label}
    </button>
  );
  return (
    <Tag className={cx(className, "ed-list")} {...containerProps}>
      {rendered}
      {isRow ? (
        <tr className="ed-add-row">
          <td colSpan={FULL_ROW_SPAN}>{add}</td>
        </tr>
      ) : (
        add
      )}
    </Tag>
  );
}
