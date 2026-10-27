"use client";
import { FileText, ImagePlus, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { blockSpecs, blockTypes } from "@/lib/content/blocks";
import type { BlockType, ImageRef, LinkRef, SiteContent } from "@/lib/content/types";
import { altFromFilename, formatBytes, type MediaItem, uploadFile } from "@/lib/studio/media";
import { pageName } from "./labels";
import { errorMessage, fetchJson, JSON_HEADERS } from "./request";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};
type DropzoneProps = {
  accept: string;
  multiple?: boolean;
  small?: boolean;
  onFiles: (files: FileList) => void;
  children: ReactNode;
};
type PickerTab = "upload" | "library" | "site";
type MediaPickerProps = {
  content: SiteContent;
  current: ImageRef;
  onClose: () => void;
  onSelect: (image: ImageRef) => void;
  onLibraryChange: () => void;
  library: MediaItem[];
  libraryError: string;
};
type LinkEditorProps = {
  content: SiteContent;
  current: LinkRef;
  onClose: () => void;
  onSave: (link: LinkRef) => void;
};
type AddSectionProps = { onClose: () => void; onAdd: (type: BlockType) => void };
type MediaLibraryProps = { library: MediaItem[]; error: string; onChange: () => void };

const PICKER_TABS: PickerTab[] = ["library", "site", "upload"];

const mediaPath = (id: string) => `/api/media/${id}`;
const isImageMime = (mime: string) => mime.startsWith("image/");

export function Modal({ title, onClose, children, footer, wide = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "st-modal st-modal-wide" : "st-modal"}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <header className="st-modal-head">
        <h2>{title}</h2>
        <button type="button" className="st-icon" onClick={onClose} aria-label="Close">
          <X />
        </button>
      </header>
      <div className="st-modal-body">{children}</div>
      {footer && <footer className="st-modal-foot">{footer}</footer>}
    </dialog>
  );
}

export function Dropzone({ accept, multiple = false, small = false, onFiles, children }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      className={["st-dropzone", small && "st-dropzone-small", dragging && "dragging"].filter(Boolean).join(" ")}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles(event.dataTransfer.files);
      }}
    >
      <input type="file" multiple={multiple} accept={accept} onChange={(event) => event.target.files && onFiles(event.target.files)} />
      {children}
    </label>
  );
}

function imagesInUse(content: SiteContent): ImageRef[] {
  const found = new Map<string, ImageRef>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (typeof record.src === "string" && typeof record.alt === "string" && record.src && !found.has(record.src))
        found.set(record.src, { src: record.src, alt: record.alt });
      Object.values(record).forEach(walk);
    }
  };
  walk(content);
  return [...found.values()];
}

export function MediaPicker({ content, current, onClose, onSelect, onLibraryChange, library, libraryError }: MediaPickerProps) {
  const [tab, setTab] = useState<PickerTab>("library");
  const [choice, setChoice] = useState<ImageRef>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const inUse = useMemo(() => imagesInUse(content), [content]);
  const images = library.filter((item) => isImageMime(item.mime));
  const tabLabels: Record<PickerTab, string> = {
    library: `Uploaded (${images.length})`,
    site: `On this site (${inUse.length})`,
    upload: "Upload new",
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const alt = choice.alt && choice.src === current.src ? choice.alt : altFromFilename(file.name);
      const result = await uploadFile(file, alt);
      setChoice({ src: result.url, alt });
      onLibraryChange();
      setTab("library");
    } catch (reason) {
      setError(errorMessage(reason, "Upload failed."));
    } finally {
      setBusy(false);
    }
  };

  const filter = (text: string) => text.toLowerCase().includes(query.toLowerCase());
  const withAlt = (image: ImageRef) => ({ src: image.src, alt: image.alt || choice.alt });
  const tile = (image: ImageRef, label: string, key: string) => (
    <button
      type="button"
      key={key}
      className={choice.src === image.src ? "st-tile selected" : "st-tile"}
      onClick={() => setChoice(withAlt(image))}
      onDoubleClick={() => onSelect(withAlt(image))}
      aria-pressed={choice.src === image.src}
    >
      <img src={image.src} alt="" loading="lazy" />
      <span>{label}</span>
    </button>
  );

  return (
    <Modal
      title="Choose an image"
      onClose={onClose}
      wide
      footer={
        <>
          {current.src && (
            <button type="button" className="st-btn st-btn-danger-quiet" onClick={() => onSelect({ src: "", alt: "" })}>
              Remove image
            </button>
          )}
          <span className="st-spacer" />
          <button type="button" className="st-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="st-btn st-btn-primary" disabled={!choice.src || busy} onClick={() => onSelect(choice)}>
            Use this image
          </button>
        </>
      }
    >
      <div className="st-picker">
        <div className="st-picker-main">
          <div className="st-tabs" role="tablist">
            {PICKER_TABS.map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                {tabLabels[id]}
              </button>
            ))}
            {tab !== "upload" && (
              <label className="st-search">
                <Search />
                <input placeholder="Filter" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
            )}
          </div>
          {tab === "upload" || (tab === "library" && !images.length) ? (
            <Dropzone accept="image/*" onFiles={(files) => upload(files[0])}>
              {busy ? <Loader2 className="st-spin" /> : <Upload />}
              <strong>{busy ? "Uploading…" : "Drag a photo here, or click to browse"}</strong>
              <span>JPG, PNG, WebP, GIF, or SVG. Large photos are resized automatically.</span>
              {libraryError && <span className="st-error">{libraryError}</span>}
            </Dropzone>
          ) : (
            <div className="st-grid">
              {tab === "library"
                ? images.filter((item) => filter(item.filename + item.alt)).map((item) => tile({ src: mediaPath(item.id), alt: item.alt }, item.filename, item.id))
                : inUse.filter((image) => filter(image.src + image.alt)).map((image) => tile(image, image.src.split("/").pop() ?? "", image.src))}
            </div>
          )}
          {error && <p className="st-error">{error}</p>}
        </div>
        <aside className="st-picker-side">
          <div className="st-preview">{choice.src ? <img src={choice.src} alt="" /> : <ImagePlus />}</div>
          <label className="st-field">
            <span>Alt text</span>
            <textarea
              rows={4}
              value={choice.alt}
              onChange={(event) => setChoice({ ...choice, alt: event.target.value })}
              placeholder="Describe the image for people using screen readers"
            />
            <small>Describe what the image shows. For maps or graphics with text, summarize the key information.</small>
          </label>
        </aside>
      </div>
    </Modal>
  );
}

export function LinkEditor({ content, current, onClose, onSave }: LinkEditorProps) {
  const [link, setLink] = useState(current);
  const [pageSlug, setPageSlug] = useState("");
  const page = content.pages.find((p) => p.slug === pageSlug);
  const kind = link.href.startsWith("mailto:") ? "email" : /^https?:/.test(link.href) ? "web" : link.href ? "page" : "none";
  return (
    <Modal
      title="Edit link"
      onClose={onClose}
      footer={
        <>
          <span className="st-spacer" />
          <button type="button" className="st-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="st-btn st-btn-primary" onClick={() => onSave({ label: link.label.trim(), href: link.href.trim() })}>
            Save link
          </button>
        </>
      }
    >
      <label className="st-field">
        <span>Text people see</span>
        <input value={link.label} onChange={(event) => setLink({ ...link, label: event.target.value })} autoFocus />
      </label>
      <label className="st-field">
        <span>Goes to</span>
        <input
          value={link.href}
          onChange={(event) => setLink({ ...link, href: event.target.value })}
          placeholder="https://…, /students#dress-code, or mailto:…"
        />
        <small>
          {kind === "web" && "Opens the external site in a new tab."}
          {kind === "email" && "Opens the visitor’s email app."}
          {kind === "page" && "Links within this website."}
          {kind === "none" && "Links without a destination are hidden on the live site."}
        </small>
      </label>
      <fieldset className="st-fieldset">
        <legend>Or pick a page on this site</legend>
        <div className="st-row">
          <select
            value={pageSlug}
            onChange={(event) => {
              setPageSlug(event.target.value);
              setLink({ ...link, href: `/${event.target.value}` });
            }}
          >
            <option value="" disabled>
              Choose a page…
            </option>
            {content.pages.map((p) => (
              <option key={p.id} value={p.slug}>
                {pageName(p)}
              </option>
            ))}
          </select>
          {page && (
            <select defaultValue="" onChange={(event) => setLink({ ...link, href: `/${page.slug}${event.target.value ? `#${event.target.value}` : ""}` })}>
              <option value="">Top of page</option>
              {page.blocks
                .filter((block) => block.visible)
                .map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.nav || ("heading" in block.data && block.data.heading) || blockSpecs[block.type].label}
                  </option>
                ))}
            </select>
          )}
        </div>
        <button type="button" className="st-btn st-btn-quiet" onClick={() => setLink({ ...link, href: `mailto:${content.settings.contactEmail}` })}>
          Use the contact email
        </button>
      </fieldset>
    </Modal>
  );
}

export function AddSection({ onClose, onAdd }: AddSectionProps) {
  return (
    <Modal title="Add a section" onClose={onClose} wide>
      <div className="st-blocklib">
        {blockTypes.map((type) => (
          <button key={type} type="button" className="st-blockcard" onClick={() => onAdd(type)}>
            <span className={`st-blockicon st-blockicon-${type}`} aria-hidden />
            <strong>{blockSpecs[type].label}</strong>
            <span>{blockSpecs[type].description}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function MediaLibrary({ library, error, onChange }: MediaLibraryProps) {
  const [busy, setBusy] = useState(0);
  const [message, setMessage] = useState("");
  const upload = async (files: FileList) => {
    const list = [...files];
    setBusy(list.length);
    setMessage("");
    for (const file of list) {
      try {
        await uploadFile(file, altFromFilename(file.name));
      } catch (reason) {
        setMessage(`${file.name}: ${errorMessage(reason, "upload failed")}`);
      }
      setBusy((count) => count - 1);
    }
    onChange();
  };
  const remove = async (item: MediaItem) => {
    if (!confirm(`Delete ${item.filename}? Pages still using it will show a broken image.`)) return;
    setMessage("");
    try {
      await fetchJson(mediaPath(item.id), { method: "DELETE" });
    } catch (reason) {
      setMessage(`${item.filename}: ${errorMessage(reason, "couldn’t delete it")}`);
    }
    onChange();
  };
  const saveAlt = async (item: MediaItem, alt: string) => {
    try {
      await fetchJson(mediaPath(item.id), { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ alt }) });
    } catch (reason) {
      setMessage(`${item.filename}: ${errorMessage(reason, "couldn’t save the alt text")}`);
    }
  };
  const copyLink = (url: string) =>
    navigator.clipboard.writeText(new URL(url, location.href).pathname).catch(() => setMessage("Couldn’t copy the link. Copy it from the address bar instead."));
  return (
    <div className="st-panel-body">
      <Dropzone small multiple accept="image/*,application/pdf" onFiles={upload}>
        {busy ? <Loader2 className="st-spin" /> : <Upload />}
        <strong>{busy ? `Uploading ${busy}…` : "Upload images or PDFs"}</strong>
        <span>Drop files here or click. PDFs get a link you can paste into any link.</span>
      </Dropzone>
      {(error || message) && <p className="st-error">{error || message}</p>}
      <ul className="st-media-list">
        {library.map((item) => {
          const url = mediaPath(item.id);
          return (
            <li key={item.id}>
              {isImageMime(item.mime) ? <img src={url} alt="" loading="lazy" /> : <FileText className="st-file-icon" />}
              <div>
                <strong title={item.filename}>{item.filename}</strong>
                <small>
                  {formatBytes(item.size)}
                  {item.width ? ` · ${item.width}×${item.height}` : ""}
                </small>
                {isImageMime(item.mime) ? (
                  <input defaultValue={item.alt} placeholder="Alt text" aria-label={`Alt text for ${item.filename}`} onBlur={(event) => saveAlt(item, event.target.value)} />
                ) : (
                  <button type="button" className="st-btn st-btn-quiet st-btn-small" onClick={() => copyLink(url)}>
                    Copy link
                  </button>
                )}
              </div>
              <button type="button" className="st-icon" aria-label={`Delete ${item.filename}`} onClick={() => remove(item)}>
                <Trash2 />
              </button>
            </li>
          );
        })}
      </ul>
      {!library.length && !error && <p className="st-muted">No uploads yet. Images already on the site are still available when choosing an image.</p>}
    </div>
  );
}
