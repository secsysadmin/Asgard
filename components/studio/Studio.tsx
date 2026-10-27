"use client";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileText,
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
import { type MouseEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { blockSpecs, createBlock, newBlockId } from "@/lib/content/blocks";
import type { Block, BlockType, ImageRef, LinkRef, SiteContent } from "@/lib/content/types";
import { blockTitle, templateFor } from "@/lib/studio/content-ops";
import { getIn, move, type Path, setIn, updateIn } from "@/lib/studio/paths";
import { altFromFilename, uploadFile } from "@/lib/studio/media";
import type { Member } from "@/lib/studio/team-import";
import { EditProvider, type EditApi } from "../edit/context";
import { PageView, type SectionWrapper } from "../site/PageView";
import { AddSection, LinkEditor, MediaLibrary, MediaPicker } from "./dialogs";
import { useDraftAutosave, useEditHistory, useElementWidth, useMediaLibrary, useToast, useUndoShortcuts, type SaveState } from "./hooks";
import { BlockInspector, PageInspector } from "./Inspector";
import { pageName } from "./labels";
import { HistoryPanel, NewPageDialog, PagesPanel, type SectionActions, SectionsPanel, SitePanel } from "./panels";
import { errorMessage, fetchJson, JSON_HEADERS } from "./request";
import { RichToolbar } from "./RichToolbar";
import { TeamImport } from "./TeamImport";

type Panel = "sections" | "pages" | "media" | "site" | "history";
type Device = "desktop" | "tablet" | "mobile";
type Dialog =
  | { kind: "image"; path: Path; current: ImageRef }
  | { kind: "link"; path: Path; current: LinkRef }
  | { kind: "add"; index: number }
  | { kind: "page" }
  | { kind: "team"; path: Path }
  | null;
type LoadedContent = { draft: SiteContent; published: SiteContent };
type SectionFrameProps = {
  block: Block;
  index: number;
  count: number;
  selected: boolean;
  actions: SectionActions;
  children: ReactNode;
};

const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 820, mobile: 390 };
const DEVICES = [
  { id: "desktop", Icon: Monitor, label: "Desktop" },
  { id: "tablet", Icon: Tablet, label: "Tablet" },
  { id: "mobile", Icon: Smartphone, label: "Phone" },
] as const;
const PANELS = [
  { id: "sections", Icon: Layers, label: "Sections" },
  { id: "pages", Icon: PanelsTopLeft, label: "Pages" },
  { id: "media", Icon: ImageIcon, label: "Media" },
  { id: "site", Icon: Settings2, label: "Site" },
  { id: "history", Icon: History, label: "History" },
] as const;
const INITIAL_CANVAS_WIDTH = 1000;
const MIN_ZOOM = 0.4;

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function saveStatus(saveState: SaveState, unpublished: boolean) {
  if (saveState === "error") return { icon: <TriangleAlert />, text: "Not saved — retrying on next edit", tone: "error" };
  if (saveState === "saving") return { icon: <Loader2 className="st-spin" />, text: "Saving draft…", tone: "" };
  if (unpublished) return { icon: <Pencil />, text: "Draft saved · not published yet", tone: "draft" };
  return { icon: <Check />, text: "Live site is up to date", tone: "ok" };
}

function SectionFrame({ block, index, count, selected, actions, children }: SectionFrameProps) {
  const visibilityLabel = block.visible ? "Hide section" : "Show section";
  return (
    <section
      id={block.id}
      data-block-id={block.id}
      className={[
        "band",
        `band-${block.type}`,
        `tone-${block.tone}`,
        "st-section",
        selected && "st-section-selected",
        !block.visible && "st-section-hidden",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => actions.select(block.id)}
    >
      <div className="st-section-bar" contentEditable={false} onClick={(event) => event.stopPropagation()}>
        <span className="st-section-name">
          {blockSpecs[block.type].label}
          {!block.visible && <em> · hidden</em>}
        </span>
        <button type="button" title="Move section up" aria-label="Move section up" disabled={index === 0} onClick={() => actions.move(index, index - 1)}>
          <ArrowUp />
        </button>
        <button type="button" title="Move section down" aria-label="Move section down" disabled={index === count - 1} onClick={() => actions.move(index, index + 1)}>
          <ArrowDown />
        </button>
        <button type="button" title={visibilityLabel} aria-label={visibilityLabel} onClick={() => actions.toggleVisible(index)}>
          {block.visible ? <EyeOff /> : <Eye />}
        </button>
        <button type="button" title="Duplicate section" aria-label="Duplicate section" onClick={() => actions.duplicate(index)}>
          <Copy />
        </button>
        <button type="button" title="Section settings" aria-label="Section settings" onClick={() => actions.select(block.id)}>
          <Settings2 />
        </button>
        <button type="button" title="Delete section" aria-label="Delete section" onClick={() => actions.remove(index)}>
          <Trash2 />
        </button>
      </div>
      {children}
      <button
        type="button"
        className="st-insert"
        contentEditable={false}
        onClick={(event) => {
          event.stopPropagation();
          actions.insertAt(index + 1);
        }}
      >
        <Plus /> Add section
      </button>
    </section>
  );
}

export function Studio() {
  const [published, setPublished] = useState<SiteContent | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("sections");
  const [panelOpen, setPanelOpen] = useState(true);
  const [device, setDevice] = useState<Device>("desktop");
  const [preview, setPreview] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [publishing, setPublishing] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);

  const { toast, notify } = useToast();
  const { content, contentRef, history, load, commit, undo, redo } = useEditHistory();
  const { saveState, markSaved } = useDraftAutosave(content, contentRef, notify);
  const { library, libraryError, loadLibrary } = useMediaLibrary();
  const canvasWidth = useElementWidth(canvas, INITIAL_CANVAS_WIDTH, !!content);
  useUndoShortcuts(undo, redo);

  useEffect(() => {
    fetchJson<LoadedContent>("/api/content")
      .then(({ draft, published }) => {
        load(draft);
        setPublished(published);
        markSaved(draft);
      })
      .catch((error) => setLoadError(errorMessage(error, "Couldn’t load content.")));
  }, [load, markSaved]);

  const api: EditApi = useMemo(
    () => ({
      set: (path, value) => commit((c) => setIn(c, path, value), path.join("/")),
      insertItem: (path, index) =>
        commit((c) =>
          updateIn(c, path, (list) => {
            const next = [...((list as unknown[]) ?? [])];
            next.splice(index, 0, templateFor(c, path));
            return next;
          }),
        ),
      removeItem: (path, index) => commit((c) => updateIn(c, path, (list) => (list as unknown[]).filter((_, i) => i !== index))),
      moveItem: (path, from, to) => commit((c) => updateIn(c, path, (list) => move(list as unknown[], from, to))),
      duplicateItem: (path, index) =>
        commit((c) =>
          updateIn(c, path, (list) => {
            const next = [...(list as unknown[])];
            next.splice(index + 1, 0, structuredClone(next[index]));
            return next;
          }),
        ),
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
          notify(errorMessage(error, "Upload failed."), "error");
        }
      },
      editLink: (path, current) => setDialog({ kind: "link", path, current }),
    }),
    [commit, notify, loadLibrary],
  );

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
  const status = saveStatus(saveState, unpublished);
  const zoom = Math.min(1, Math.max(MIN_ZOOM, canvasWidth / DEVICE_WIDTH[device]));

  const openPage = (index: number) => {
    setPageIndex(index);
    setSelected(null);
  };
  const scrollToBlock = (id: string) =>
    canvas.current?.querySelector(`[data-block-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const setBlocks = (update: (blocks: Block[]) => Block[]) =>
    commit((c) => updateIn(c, [...pageBase, "blocks"], (blocks) => update(blocks as Block[])));

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

  const sectionActions: SectionActions = {
    select: (id) => {
      setSelected(id);
      setPanel("sections");
    },
    reveal: (id) => {
      setSelected(id);
      scrollToBlock(id);
    },
    move: (from, to) => {
      if (to >= 0 && to < page.blocks.length) setBlocks((blocks) => move(blocks, from, to));
    },
    toggleVisible: (index) => api.set([...pageBase, "blocks", index, "visible"], !page.blocks[index].visible),
    duplicate: duplicateBlock,
    remove: deleteBlock,
    insertAt: (index) => setDialog({ kind: "add", index }),
  };

  const wrap: SectionWrapper = (block, index, node) => (
    <SectionFrame key={block.id} block={block} index={index} count={page.blocks.length} selected={selected === block.id} actions={sectionActions}>
      {node}
    </SectionFrame>
  );

  const publish = async () => {
    setPublishing(true);
    try {
      const body = await fetchJson<{ content: SiteContent }>("/api/content/publish", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ content, label: "" }),
      });
      setPublished(body.content);
      markSaved(content);
      notify("Published. The live site now shows your changes.");
    } catch (error) {
      notify(errorMessage(error, "Publishing failed."), "error");
    } finally {
      setPublishing(false);
    }
  };

  const onCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) return;
    event.preventDefault();
    const hash = anchor.getAttribute("href")?.match(/^#(.+)/)?.[1];
    if (hash) scrollToBlock(hash);
    else if (preview) notify("Links are disabled in preview. Use “View live” to click through the site.");
  };

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
              openPage(Number(event.target.value));
              canvas.current?.scrollTo({ top: 0 });
            }}
          >
            {content.pages.map((p, i) => (
              <option key={p.id} value={i}>
                {pageName(p)} — /{p.slug}
              </option>
            ))}
          </select>
        </label>
        <div className="st-top-group">
          <button type="button" className="st-icon" onClick={undo} disabled={!history.canUndo} title="Undo (⌘Z)" aria-label="Undo">
            <Undo2 />
          </button>
          <button type="button" className="st-icon" onClick={redo} disabled={!history.canRedo} title="Redo (⌘⇧Z)" aria-label="Redo">
            <Redo2 />
          </button>
        </div>
        <div className="st-top-group st-devices" role="group" aria-label="Preview width">
          {DEVICES.map(({ id, Icon, label }) => (
            <button key={id} type="button" className="st-icon" aria-pressed={device === id} title={label} aria-label={`${label} preview`} onClick={() => setDevice(id)}>
              <Icon />
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
        <a className="st-btn" href={`/${page.slug}`} target="_blank" rel="noreferrer">
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
                {PANELS.map(({ id, Icon, label }) => (
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
                    <Icon />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
              <div className="st-panel" hidden={!panelOpen}>
                {panel === "sections" && <SectionsPanel blocks={page.blocks} selected={selected} actions={sectionActions} />}
                {panel === "pages" && (
                  <PagesPanel
                    key={page.id}
                    content={content}
                    pageIndex={pageIndex}
                    onSelect={openPage}
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
                      openPage(0);
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
            <div ref={canvas} className={`st-canvas st-device-${device}`} onClickCapture={onCanvasClick}>
              {zoom < 1 && <span className="st-zoom">{device === "desktop" ? "Desktop" : "Tablet"} · {Math.round(zoom * 100)}%</span>}
              <div className="st-frame" style={{ width: DEVICE_WIDTH[device], zoom }}>
                {preview ? (
                  <EditProvider value={null}>
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
                  onTeamImport={() => setDialog({ kind: "team", path: [...pageBase, "blocks", blockIndex, "data", "members"] })}
                />
              ) : (
                <PageInspector page={page} pageIndex={pageIndex} api={api} />
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
        {dialog?.kind === "team" && (
          <TeamImport
            members={(getIn(content, dialog.path) as Member[]) ?? []}
            onClose={() => setDialog(null)}
            onLibraryChange={loadLibrary}
            onApply={(members, summary) => {
              commit((c) => setIn(c, dialog.path, members));
              setDialog(null);
              notify(`Team updated (${summary}). Publish to make it live.`);
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
              openPage(content.pages.length);
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
