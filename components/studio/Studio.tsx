"use client";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  History,
  ImageIcon,
  Laptop,
  Layers,
  Loader2,
  Monitor,
  PanelsTopLeft,
  Pencil,
  Plus,
  Redo2,
  Settings2,
  Smartphone,
  Tablet,
  Trash2,
  TriangleAlert,
  Undo2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { blankLike, blockSpecs, createBlock, newBlockId } from "@/lib/content/blocks";
import { RESERVED_SLUGS, slugify } from "@/lib/content/normalize";
import type { Block, BlockType, ImageRef, LinkRef, Page, SiteContent } from "@/lib/content/types";
import { getIn, move, type Path, setIn, updateIn } from "@/lib/studio/paths";
import { type MediaItem, uploadFile, altFromFilename } from "@/lib/studio/media";
import { EditProvider, type EditApi, List as EditableList, Lnk, Rich } from "../edit/context";
import { PageView, type SectionWrapper } from "../site/PageView";
import { AddSection, LinkEditor, MediaLibrary, MediaPicker, Modal } from "./dialogs";
import { BlockInspector } from "./Inspector";
import { RichToolbar } from "./RichToolbar";

type Panel = "sections" | "pages" | "media" | "site" | "history";
type Device = "desktop" | "tablet" | "mobile";
type SaveState = "idle" | "saving" | "saved" | "error";
type Dialog =
  | { kind: "image"; path: Path; current: ImageRef }
  | { kind: "link"; path: Path; current: LinkRef }
  | { kind: "add"; index: number }
  | { kind: "page" }
  | null;

const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 820, mobile: 390 };

function blockTitle(block: Block) {
  const data = block.data as Record<string, unknown>;
  return block.nav || (typeof data.heading === "string" && data.heading) || (typeof data.title === "string" && data.title) || blockSpecs[block.type].label;
}

/** A blank item for a list, shaped like its siblings or the block's starter. */
function templateFor(content: SiteContent, listPath: Path): unknown {
  const list = getIn(content, listPath);
  if (Array.isArray(list) && list.length) return blankLike(list[0]);
  if (listPath[0] === "pages" && listPath[2] === "blocks") {
    const block = getIn(content, listPath.slice(0, 4)) as Block;
    let node: unknown = blockSpecs[block.type].starter();
    for (const key of listPath.slice(5)) node = Array.isArray(node) ? node[0] : (node as Record<string, unknown> | undefined)?.[key as string];
    if (Array.isArray(node) && node.length) return blankLike(node[0]);
  }
  const key = String(listPath[listPath.length - 1]);
  if (key === "gallery" || key === "images") return { src: "", alt: "" };
  if (key === "links" || key === "nav") return { label: "", href: "" };
  if (key === "facts") return { label: "", value: "" };
  if (key === "people") return { name: "", role: "", phone: "" };
  if (key === "columns") return "Column";
  return "";
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function Studio() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [published, setPublished] = useState<SiteContent | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("sections");
  const [device, setDevice] = useState<Device>("desktop");
  const [preview, setPreview] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone?: "error" } | null>(null);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [libraryError, setLibraryError] = useState("");
  const [dragBlock, setDragBlock] = useState<{ from: number; over: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(1000);

  const past = useRef<SiteContent[]>([]);
  const future = useRef<SiteContent[]>([]);
  const lastEdit = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const savedJson = useRef("");
  const canvas = useRef<HTMLDivElement>(null);
  const contentRef = useRef<SiteContent | null>(null);
  contentRef.current = content;

  const notify = useCallback((text: string, tone?: "error") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast((current) => (current?.text === text ? null : current)), 4200);
  }, []);

  /* ── Loading ── */
  useEffect(() => {
    fetch("/api/content")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail ? `${body.error} (${body.detail})` : body.error);
        setContent(body.draft);
        setPublished(body.published);
        savedJson.current = JSON.stringify(body.draft);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Couldn’t load content."));
  }, []);

  const loadLibrary = useCallback(() => {
    fetch("/api/media")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setLibrary(body);
        setLibraryError("");
      })
      .catch((error) => setLibraryError(error instanceof Error ? error.message : "Media library unavailable."));
  }, []);
  useEffect(loadLibrary, [loadLibrary]);

  // Track the canvas width so wide device previews can be scaled to fit.
  const loaded = !!content;
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setCanvasWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [loaded, preview]);

  /* ── Editing with undo history ── */
  const commit = useCallback((next: SiteContent | ((current: SiteContent) => SiteContent), coalesceKey = "") => {
    const current = contentRef.current;
    if (!current) return;
    const value = typeof next === "function" ? next(current) : next;
    if (value === current) return;
    const now = Date.now();
    const coalesce = coalesceKey && lastEdit.current.key === coalesceKey && now - lastEdit.current.at < 1200;
    if (!coalesce) {
      past.current = [...past.current.slice(-80), current];
      future.current = [];
    }
    lastEdit.current = { key: coalesceKey, at: now };
    contentRef.current = value;
    setContent(value);
  }, []);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous || !contentRef.current) return;
    future.current.push(contentRef.current);
    lastEdit.current = { key: "", at: 0 };
    setContent(previous);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !contentRef.current) return;
    past.current.push(contentRef.current);
    lastEdit.current = { key: "", at: 0 };
    setContent(next);
  }, []);

  const api: EditApi = useMemo(
    () => ({
      set: (path, value) => commit((c) => setIn(c, path, value), path.join("/")),
      insertItem: (path, index) => commit((c) => updateIn(c, path, (list) => {
        const next = [...((list as unknown[]) ?? [])];
        next.splice(index, 0, templateFor(c, path));
        return next;
      })),
      removeItem: (path, index) => commit((c) => updateIn(c, path, (list) => (list as unknown[]).filter((_, i) => i !== index))),
      moveItem: (path, from, to) => commit((c) => updateIn(c, path, (list) => move(list as unknown[], from, to))),
      duplicateItem: (path, index) => commit((c) => updateIn(c, path, (list) => {
        const next = [...(list as unknown[])];
        next.splice(index + 1, 0, structuredClone(next[index]));
        return next;
      })),
      pickImage: (path, current) => setDialog({ kind: "image", path, current }),
      dropImage: async (path, file, current) => {
        notify("Uploading image…");
        try {
          const alt = current.alt || altFromFilename(file.name);
          const result = await uploadFile(file, alt);
          commit((c) => setIn(c, path, { src: result.url, alt }));
          loadLibrary();
          notify("Image replaced. Check its alt text in the inspector.");
        } catch (error) {
          notify(error instanceof Error ? error.message : "Upload failed.", "error");
        }
      },
      editLink: (path, current) => setDialog({ kind: "link", path, current }),
    }),
    [commit, notify, loadLibrary],
  );

  /* ── Autosave draft ── */
  useEffect(() => {
    if (!content) return;
    const json = JSON.stringify(content);
    if (json === savedJson.current) return;
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: json });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Save failed");
        savedJson.current = json;
        setSaveState("saved");
      } catch (error) {
        setSaveState("error");
        notify(error instanceof Error ? error.message : "Couldn’t save the draft.", "error");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [content, notify]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (contentRef.current && JSON.stringify(contentRef.current) !== savedJson.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const editing = (event.target as HTMLElement).closest("[contenteditable], input, textarea, select");
      if (mod && event.key.toLowerCase() === "z" && !editing) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (mod && event.key.toLowerCase() === "y" && !editing) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  if (loadError)
    return (
      <div className="st-fatal">
        <TriangleAlert />
        <h1>The studio couldn’t load</h1>
        <p>{loadError}</p>
        <p>Check that DATABASE_URL is set and the Neon database is reachable, then reload.</p>
      </div>
    );
  if (!content || !published)
    return (
      <div className="st-fatal">
        <Loader2 className="st-spin" />
        <p>Loading the studio…</p>
      </div>
    );

  const page = content.pages[Math.min(pageIndex, content.pages.length - 1)];
  const pageBase: Path = ["pages", pageIndex];
  const blockIndex = page.blocks.findIndex((block) => block.id === selected);
  const selectedBlock = blockIndex >= 0 ? page.blocks[blockIndex] : null;
  const unpublished = !sameJson(content, published);
  const dirty = saveState === "saving";

  /* ── Section operations ── */
  const setBlocks = (update: (blocks: Block[]) => Block[]) => commit((c) => updateIn(c, [...pageBase, "blocks"], (blocks) => update(blocks as Block[])));
  const addBlock = (type: BlockType, index: number) => {
    const block = createBlock(type);
    if (page.layout === "guide" && "heading" in block.data) block.nav = String(block.data.heading);
    setBlocks((blocks) => [...blocks.slice(0, index), block, ...blocks.slice(index)]);
    setSelected(block.id);
    setDialog(null);
    requestAnimationFrame(() => scrollToBlock(block.id));
  };
  const duplicateBlock = (index: number) => {
    const copy = { ...structuredClone(page.blocks[index]), id: newBlockId(page.blocks[index].type) };
    setBlocks((blocks) => [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]);
    setSelected(copy.id);
  };
  const deleteBlock = (index: number) => {
    if (!confirm(`Delete “${blockTitle(page.blocks[index])}”? You can undo this.`)) return;
    setBlocks((blocks) => blocks.filter((_, i) => i !== index));
    setSelected(null);
  };
  const scrollToBlock = (id: string) =>
    canvas.current?.querySelector(`[data-block-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const wrap: SectionWrapper = (block, index, node) => (
    <section
      key={block.id}
      id={block.id}
      data-block-id={block.id}
      className={[
        "band",
        `band-${block.type}`,
        `tone-${block.tone}`,
        "st-section",
        selected === block.id && "st-section-selected",
        !block.visible && "st-section-hidden",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        setSelected(block.id);
        setPanel("sections");
      }}
    >
      <div className="st-section-bar" contentEditable={false} onClick={(event) => event.stopPropagation()}>
        <span className="st-section-name">
          {blockSpecs[block.type].label}
          {!block.visible && <em> · hidden</em>}
        </span>
        <button type="button" title="Move section up" aria-label="Move section up" disabled={index === 0} onClick={() => setBlocks((b) => move(b, index, index - 1))}>
          <ArrowUp />
        </button>
        <button type="button" title="Move section down" aria-label="Move section down" disabled={index === page.blocks.length - 1} onClick={() => setBlocks((b) => move(b, index, index + 1))}>
          <ArrowDown />
        </button>
        <button type="button" title={block.visible ? "Hide section" : "Show section"} aria-label={block.visible ? "Hide section" : "Show section"} onClick={() => api.set([...pageBase, "blocks", index, "visible"], !block.visible)}>
          {block.visible ? <EyeOff /> : <Eye />}
        </button>
        <button type="button" title="Duplicate section" aria-label="Duplicate section" onClick={() => duplicateBlock(index)}>
          <Copy />
        </button>
        <button type="button" title="Section settings" aria-label="Section settings" onClick={() => { setSelected(block.id); setPanel("sections"); }}>
          <Settings2 />
        </button>
        <button type="button" title="Delete section" aria-label="Delete section" onClick={() => deleteBlock(index)}>
          <Trash2 />
        </button>
      </div>
      {node}
      <button
        type="button"
        className="st-insert"
        contentEditable={false}
        onClick={(event) => {
          event.stopPropagation();
          setDialog({ kind: "add", index: index + 1 });
        }}
      >
        <Plus /> Add section
      </button>
    </section>
  );

  /* ── Publishing ── */
  const publish = async () => {
    setPublishing(true);
    try {
      const response = await fetch("/api/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, label: "" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPublished(body.content);
      savedJson.current = JSON.stringify(content);
      setSaveState("saved");
      notify("Published. The live site now shows your changes.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Publishing failed.", "error");
    } finally {
      setPublishing(false);
    }
  };

  const status =
    saveState === "error"
      ? { icon: <TriangleAlert />, text: "Not saved — retrying on next edit", tone: "error" }
      : dirty
        ? { icon: <Loader2 className="st-spin" />, text: "Saving draft…", tone: "" }
        : unpublished
          ? { icon: <Pencil />, text: "Draft saved · not published yet", tone: "draft" }
          : { icon: <Check />, text: "Live site is up to date", tone: "ok" };

  const livePath = `/${page.slug}`;
  const zoom = Math.min(1, Math.max(0.4, canvasWidth / DEVICE_WIDTH[device]));

  return (
    <div className={preview ? "studio studio-preview" : "studio"}>
      <header className="st-top">
        <a className="st-logo" href="/" target="_blank" rel="noreferrer">
          SEC <span>Site Studio</span>
        </a>
        <label className="st-page-select">
          <span className="sr-only">Page</span>
          <FileText />
          <select
            value={pageIndex}
            onChange={(event) => {
              setPageIndex(Number(event.target.value));
              setSelected(null);
              canvas.current?.scrollTo({ top: 0 });
            }}
          >
            {content.pages.map((p, i) => (
              <option key={p.id} value={i}>
                {p.slug ? p.title : "Home"} — /{p.slug}
              </option>
            ))}
          </select>
        </label>
        <div className="st-top-group">
          <button type="button" className="st-icon" onClick={undo} disabled={!past.current.length} title="Undo (⌘Z)" aria-label="Undo">
            <Undo2 />
          </button>
          <button type="button" className="st-icon" onClick={redo} disabled={!future.current.length} title="Redo (⌘⇧Z)" aria-label="Redo">
            <Redo2 />
          </button>
        </div>
        <div className="st-top-group st-devices" role="group" aria-label="Preview width">
          {(
            [
              ["desktop", <Monitor key="d" />, "Desktop"],
              ["tablet", <Tablet key="t" />, "Tablet"],
              ["mobile", <Smartphone key="m" />, "Phone"],
            ] as const
          ).map(([id, icon, label]) => (
            <button key={id} type="button" className="st-icon" aria-pressed={device === id} title={label} aria-label={`${label} preview`} onClick={() => setDevice(id)}>
              {icon}
            </button>
          ))}
        </div>
        <span className={`st-status st-status-${status.tone}`} role="status">
          {status.icon}
          {status.text}
        </span>
        <span className="st-spacer" />
        <button type="button" className="st-btn" aria-pressed={preview} onClick={() => setPreview(!preview)}>
          {preview ? <Pencil /> : <Eye />} {preview ? "Back to editing" : "Preview"}
        </button>
        <a className="st-btn" href={livePath} target="_blank" rel="noreferrer">
          <Laptop /> View live
        </a>
        <button type="button" className="st-btn st-btn-primary" onClick={publish} disabled={publishing || !unpublished || dirty}>
          {publishing ? <Loader2 className="st-spin" /> : <Upload />} Publish
        </button>
      </header>

      <EditProvider value={api}>
        <div className="st-body">
          {!preview && (
            <aside className="st-left">
              <nav className="st-rail" aria-label="Studio panels">
                {(
                  [
                    ["sections", <Layers key="s" />, "Sections"],
                    ["pages", <PanelsTopLeft key="p" />, "Pages"],
                    ["media", <ImageIcon key="m" />, "Media"],
                    ["site", <Settings2 key="g" />, "Site"],
                    ["history", <History key="h" />, "History"],
                  ] as const
                ).map(([id, icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={panel === id && panelOpen}
                    title={panel === id && panelOpen ? "Click again to collapse" : undefined}
                    onClick={() => {
                      setPanelOpen(panel !== id || !panelOpen);
                      setPanel(id);
                    }}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
              <div className="st-panel" hidden={!panelOpen}>
                {panel === "sections" && (
                  <>
                    <div className="st-panel-head">
                      <h2>Sections</h2>
                      <p>Drag to reorder. Click to edit.</p>
                    </div>
                    <ol className="st-outline">
                      {page.blocks.map((block, index) => (
                        <li
                          key={block.id}
                          draggable
                          className={[
                            selected === block.id && "active",
                            !block.visible && "is-hidden",
                            dragBlock?.over === index && dragBlock.from !== index && (dragBlock.from < index ? "drop-after" : "drop-before"),
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", block.id);
                            setDragBlock({ from: index, over: index });
                          }}
                          onDragOver={(event) => {
                            if (!dragBlock) return;
                            event.preventDefault();
                            if (dragBlock.over !== index) setDragBlock({ ...dragBlock, over: index });
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (dragBlock && dragBlock.from !== index) setBlocks((b) => move(b, dragBlock.from, index));
                            setDragBlock(null);
                          }}
                          onDragEnd={() => setDragBlock(null)}
                        >
                          <button
                            type="button"
                            className="st-outline-item"
                            onClick={() => {
                              setSelected(block.id);
                              scrollToBlock(block.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                                event.preventDefault();
                                const to = index + (event.key === "ArrowUp" ? -1 : 1);
                                if (to >= 0 && to < page.blocks.length) setBlocks((b) => move(b, index, to));
                              }
                            }}
                            title="Alt + ↑/↓ to move with the keyboard"
                          >
                            <GripVertical className="st-grip" />
                            <span>
                              <strong>{blockTitle(block)}</strong>
                              <small>
                                {blockSpecs[block.type].label}
                                {block.group ? ` · ${block.group}` : ""}
                              </small>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="st-icon"
                            aria-label={block.visible ? `Hide ${blockTitle(block)}` : `Show ${blockTitle(block)}`}
                            title={block.visible ? "Hide" : "Show"}
                            onClick={() => api.set([...pageBase, "blocks", index, "visible"], !block.visible)}
                          >
                            {block.visible ? <Eye /> : <EyeOff />}
                          </button>
                        </li>
                      ))}
                    </ol>
                    <button type="button" className="st-btn st-btn-block" onClick={() => setDialog({ kind: "add", index: blockIndex >= 0 ? blockIndex + 1 : page.blocks.length })}>
                      <Plus /> Add section
                    </button>
                  </>
                )}
                {panel === "pages" && (
                  <PagesPanel
                    content={content}
                    pageIndex={pageIndex}
                    onSelect={(i) => {
                      setPageIndex(i);
                      setSelected(null);
                    }}
                    onAdd={() => setDialog({ kind: "page" })}
                    commit={commit}
                    api={api}
                  />
                )}
                {panel === "media" && (
                  <>
                    <div className="st-panel-head">
                      <h2>Media library</h2>
                      <p>Uploads are stored in the site database. To swap an image on the page, click it or drag a file onto it.</p>
                    </div>
                    <MediaLibrary library={library} error={libraryError} onChange={loadLibrary} />
                  </>
                )}
                {panel === "site" && <SitePanel content={content} api={api} />}
                {panel === "history" && (
                  <HistoryPanel
                    onRestore={(restored, label) => {
                      commit(restored);
                      setPageIndex(0);
                      setSelected(null);
                      notify(`${label} restored into your draft. Publish to make it live.`);
                    }}
                    onRevert={() => {
                      if (!confirm("Discard all unpublished changes and go back to the live version?")) return;
                      commit(structuredClone(published));
                      notify("Draft reset to the live version.");
                    }}
                    unpublished={unpublished}
                  />
                )}
              </div>
            </aside>
          )}

          <main className="st-canvas-wrap" aria-label="Page canvas">
            <div
              ref={canvas}
              className={`st-canvas st-device-${device}`}
              onClickCapture={(event) => {
                const anchor = (event.target as HTMLElement).closest("a");
                if (!anchor) return;
                event.preventDefault();
                const hash = anchor.getAttribute("href")?.match(/^#(.+)/)?.[1];
                if (hash) scrollToBlock(hash);
                else if (preview) notify("Links are disabled in preview. Use “View live” to click through the site.");
              }}
            >
              {zoom < 1 && <span className="st-zoom">{device === "desktop" ? "Desktop" : "Tablet"} · {Math.round(zoom * 100)}%</span>}
              <div className="st-frame" style={{ width: DEVICE_WIDTH[device], zoom }}>
                {preview ? (
                  <EditProvider value={null as unknown as EditApi}>
                    <PageView content={content} pageIndex={pageIndex} />
                  </EditProvider>
                ) : (
                  <PageView content={content} pageIndex={pageIndex} wrap={wrap} />
                )}
              </div>
            </div>
          </main>

          {!preview && (
            <aside className="st-right" aria-label="Inspector">
              {selectedBlock ? (
                <BlockInspector
                  key={selectedBlock.id}
                  block={selectedBlock}
                  index={blockIndex}
                  pageIndex={pageIndex}
                  page={page}
                  api={api}
                  onDelete={() => deleteBlock(blockIndex)}
                  onDuplicate={() => duplicateBlock(blockIndex)}
                />
              ) : (
                <div className="st-inspector-body">
                  <p className="st-kicker">Page</p>
                  <h2 className="st-inspector-title">{page.slug ? page.title : "Home"}</h2>
                  <ul className="st-howto">
                    <li><strong>Edit text:</strong> click any text on the page and type. Select words to bold, italicize, or link them.</li>
                    <li><strong>Swap images:</strong> click an image, or drag a photo from your computer onto it.</li>
                    <li><strong>Lists:</strong> hover an item for move, duplicate, and delete; drag the handle to reorder.</li>
                    <li><strong>Sections:</strong> drag them in the left panel, or use the bar above each section.</li>
                    <li><strong>Go live:</strong> changes autosave as a draft. Press Publish when you’re ready.</li>
                  </ul>
                  <PageSettings page={page} pageIndex={pageIndex} api={api} />
                </div>
              )}
            </aside>
          )}
        </div>
        <RichToolbar />

        {dialog?.kind === "image" && (
          <MediaPicker
            content={content}
            current={dialog.current}
            library={library}
            libraryError={libraryError}
            onLibraryChange={loadLibrary}
            onClose={() => setDialog(null)}
            onSelect={(image) => {
              api.set(dialog.path, image);
              setDialog(null);
            }}
          />
        )}
        {dialog?.kind === "link" && (
          <LinkEditor
            content={content}
            current={dialog.current}
            onClose={() => setDialog(null)}
            onSave={(link) => {
              api.set(dialog.path, link);
              setDialog(null);
            }}
          />
        )}
        {dialog?.kind === "add" && <AddSection onClose={() => setDialog(null)} onAdd={(type) => addBlock(type, dialog.index)} />}
        {dialog?.kind === "page" && (
          <NewPageDialog
            content={content}
            currentPage={page}
            onClose={() => setDialog(null)}
            onCreate={(newPage, addToNav) => {
              commit((c) => ({
                ...c,
                pages: [...c.pages, newPage],
                settings: addToNav ? { ...c.settings, nav: [...c.settings.nav, { label: newPage.title, href: `/${newPage.slug}` }] } : c.settings,
              }));
              setPageIndex(content.pages.length);
              setSelected(null);
              setPanel("sections");
              setDialog(null);
              notify("Page created. It goes live when you publish.");
            }}
          />
        )}
      </EditProvider>
      {toast && (
        <div className={toast.tone === "error" ? "st-toast st-toast-error" : "st-toast"} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}

function PageSettings({ page, pageIndex, api }: { page: Page; pageIndex: number; api: EditApi }) {
  const base: Path = ["pages", pageIndex];
  return (
    <section className="st-group">
      <h3>Page settings</h3>
      <label className="st-field">
        <span>Page title</span>
        <input value={page.title} onChange={(event) => api.set([...base, "title"], event.target.value)} />
        <small>Shown in browser tabs and search results.</small>
      </label>
      <label className="st-field">
        <span>Search description</span>
        <textarea rows={3} value={page.description} onChange={(event) => api.set([...base, "description"], event.target.value)} />
        <small>{page.description.length}/160 characters recommended.</small>
      </label>
      <label className="st-field">
        <span>Layout</span>
        <select value={page.layout} onChange={(event) => api.set([...base, "layout"], event.target.value)}>
          <option value="landing">Landing — full-width sections</option>
          <option value="guide">Guide — with an “On this page” menu</option>
        </select>
      </label>
    </section>
  );
}

function PagesPanel({
  content,
  pageIndex,
  onSelect,
  onAdd,
  commit,
  api,
}: {
  content: SiteContent;
  pageIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  commit: (update: (c: SiteContent) => SiteContent) => void;
  api: EditApi;
}) {
  const page = content.pages[pageIndex];
  const [slug, setSlug] = useState(page.slug);
  useEffect(() => setSlug(page.slug), [page.slug]);
  const slugError =
    !slug ? "Enter a URL" : RESERVED_SLUGS.has(slug) ? "That URL is reserved" : content.pages.some((p, i) => i !== pageIndex && p.slug === slug) ? "Another page uses this URL" : "";
  return (
    <>
      <div className="st-panel-head">
        <h2>Pages</h2>
        <p>Choose a page to edit, or add a new one.</p>
      </div>
      <ul className="st-pages">
        {content.pages.map((p, i) => (
          <li key={p.id}>
            <button type="button" aria-pressed={i === pageIndex} onClick={() => onSelect(i)}>
              <strong>{p.slug ? p.title : "Home"}</strong>
              <small>/{p.slug}</small>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="st-btn st-btn-block" onClick={onAdd}>
        <Plus /> New page
      </button>
      {pageIndex > 0 && (
        <section className="st-group">
          <h3>This page’s address</h3>
          <label className="st-field">
            <span>URL</span>
            <div className="st-prefix">
              <span>/</span>
              <input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} />
            </div>
            {slugError ? <small className="st-error">{slugError}</small> : <small>Changing this breaks old links to the page.</small>}
          </label>
          <div className="st-row">
            <button type="button" className="st-btn st-btn-small" disabled={!!slugError || slug === page.slug} onClick={() => api.set(["pages", pageIndex, "slug"], slug)}>
              Save URL
            </button>
            <button
              type="button"
              className="st-btn st-btn-small st-btn-danger-quiet"
              onClick={() => {
                if (!confirm(`Delete the “${page.title}” page? It will disappear from the live site when you publish.`)) return;
                onSelect(0);
                commit((c) => ({ ...c, pages: c.pages.filter((_, i) => i !== pageIndex) }));
              }}
            >
              <Trash2 /> Delete page
            </button>
          </div>
        </section>
      )}
    </>
  );
}

function NewPageDialog({
  content,
  currentPage,
  onClose,
  onCreate,
}: {
  content: SiteContent;
  currentPage: Page;
  onClose: () => void;
  onCreate: (page: Page, addToNav: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [layout, setLayout] = useState<Page["layout"]>("guide");
  const [start, setStart] = useState<"blank" | "copy">("blank");
  const [addToNav, setAddToNav] = useState(true);
  const finalSlug = touched ? slug : slugify(title);
  const error = !title.trim()
    ? ""
    : !finalSlug
      ? "Enter a URL"
      : RESERVED_SLUGS.has(finalSlug) || content.pages.some((p) => p.slug === finalSlug)
        ? "That URL is already used"
        : "";
  const create = () => {
    const header = createBlock("pageHeader");
    if (header.type === "pageHeader") header.data = { eyebrow: "", title: title.trim(), intro: "<p>Introduce this page.</p>" };
    const blocks =
      start === "copy"
        ? currentPage.blocks.map((block) => ({ ...structuredClone(block) }))
        : [header, { ...createBlock("text"), nav: "Overview" }];
    onCreate(
      { id: `page-${Math.random().toString(36).slice(2, 8)}`, slug: finalSlug, title: title.trim(), description: "", layout, blocks },
      addToNav,
    );
  };
  return (
    <Modal
      title="New page"
      onClose={onClose}
      footer={
        <>
          <span className="st-spacer" />
          <button type="button" className="st-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="st-btn st-btn-primary" disabled={!title.trim() || !!error} onClick={create}>
            Create page
          </button>
        </>
      }
    >
      <label className="st-field">
        <span>Page title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="e.g. Spring Career Fair" />
      </label>
      <label className="st-field">
        <span>URL</span>
        <div className="st-prefix">
          <span>/</span>
          <input
            value={finalSlug}
            onChange={(event) => {
              setTouched(true);
              setSlug(slugify(event.target.value));
            }}
          />
        </div>
        {error && <small className="st-error">{error}</small>}
      </label>
      <label className="st-field">
        <span>Layout</span>
        <select value={layout} onChange={(event) => setLayout(event.target.value as Page["layout"])}>
          <option value="guide">Guide — with an “On this page” menu</option>
          <option value="landing">Landing — full-width sections</option>
        </select>
      </label>
      <label className="st-field">
        <span>Start from</span>
        <select value={start} onChange={(event) => setStart(event.target.value as "blank" | "copy")}>
          <option value="blank">A blank page</option>
          <option value="copy">A copy of “{currentPage.slug ? currentPage.title : "Home"}”</option>
        </select>
      </label>
      <label className="st-check">
        <input type="checkbox" checked={addToNav} onChange={(event) => setAddToNav(event.target.checked)} />
        <span>Add to the main menu</span>
      </label>
    </Modal>
  );
}

function SitePanel({ content, api }: { content: SiteContent; api: EditApi }) {
  const { settings } = content;
  return (
    <>
      <div className="st-panel-head">
        <h2>Site settings</h2>
        <p>The header menu, footer, and site-wide announcement appear on every page.</p>
      </div>
      <div className="st-panel-body">
        <section className="st-group">
          <h3>Main menu</h3>
          <EditableList
            as="ol"
            className="st-navlist"
            items={settings.nav}
            path={["settings", "nav"]}
            label="menu link"
            render={(link, _i, p) => (
              <li>
                <Lnk value={link} path={p} />
              </li>
            )}
          />
        </section>
        <section className="st-group">
          <h3>Header button</h3>
          <div className="st-navlist">
            <Lnk value={settings.headerCta} path={["settings", "headerCta"]} />
          </div>
        </section>
        <section className="st-group">
          <h3>Announcement bar</h3>
          <Rich value={settings.announcement} path={["settings", "announcement"]} className="st-rich-input" placeholder="e.g. Shuttle times changed for Thursday — leave empty to hide" />
        </section>
        <section className="st-group">
          <label className="st-field">
            <span>Site name</span>
            <input value={settings.siteName} onChange={(event) => api.set(["settings", "siteName"], event.target.value)} />
          </label>
          <label className="st-field">
            <span>Contact email (footer)</span>
            <input type="email" value={settings.contactEmail} onChange={(event) => api.set(["settings", "contactEmail"], event.target.value)} />
          </label>
          <label className="st-field">
            <span>Footer text</span>
            <textarea rows={3} value={settings.footerNote} onChange={(event) => api.set(["settings", "footerNote"], event.target.value)} />
          </label>
        </section>
      </div>
    </>
  );
}

function HistoryPanel({
  onRestore,
  onRevert,
  unpublished,
}: {
  onRestore: (content: SiteContent, label: string) => void;
  onRevert: () => void;
  unpublished: boolean;
}) {
  const [revisions, setRevisions] = useState<{ id: number; label: string; created_at: string }[] | null>(null);
  useEffect(() => {
    fetch("/api/content/revisions")
      .then((response) => response.json())
      .then(setRevisions)
      .catch(() => setRevisions([]));
  }, []);
  const restore = async (id: number, when: string) => {
    const response = await fetch(`/api/content/revisions/${id}`);
    if (response.ok) onRestore(await response.json(), `The version from ${when}`);
  };
  return (
    <>
      <div className="st-panel-head">
        <h2>History</h2>
        <p>Every publish is saved. Restoring loads that version into your draft.</p>
      </div>
      <div className="st-panel-body">
        <button type="button" className="st-btn st-btn-block" disabled={!unpublished} onClick={onRevert}>
          <Undo2 /> Discard unpublished changes
        </button>
        {revisions === null ? (
          <p className="st-muted">Loading…</p>
        ) : revisions.length === 0 ? (
          <p className="st-muted">Nothing published from the studio yet.</p>
        ) : (
          <ol className="st-history">
            {revisions.map((revision, i) => {
              const when = new Date(revision.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
              return (
                <li key={revision.id}>
                  <span>
                    <strong>{when}</strong>
                    <small>{i === 0 ? "Live now" : revision.label || "Published"}</small>
                  </span>
                  <button type="button" className="st-btn st-btn-small" onClick={() => restore(revision.id, when)}>
                    Restore
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
