"use client";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  History,
  ImageIcon,
  Layers,
  Loader2,
  Monitor,
  PanelsTopLeft,
  Pencil,
  Plus,
  Redo2,
  RotateCw,
  Settings2,
  Smartphone,
  Tablet,
  Trash2,
  TriangleAlert,
  Undo2,
  Upload,
  X,
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
import { AddSection, ConfirmDialog, type ConfirmRequest, LinkEditor, MediaLibrary, MediaPicker } from "./dialogs";
import { useDraftAutosave, useEditHistory, useElementWidth, useMediaLibrary, useToast, useUndoShortcuts, type SaveState } from "./hooks";
import { BlockInspector, PageInspector } from "./Inspector";
import { pageName } from "./labels";
import { HistoryPanel, NewPageDialog, PagesPanel, type SectionActions, SectionsPanel, SitePanel } from "./panels";
import { errorMessage, fetchJson, JSON_HEADERS } from "./request";
import { RichToolbar } from "./RichToolbar";
import { TeamImport } from "./TeamImport";
import { SignOut } from "./SignOut";

type Panel = "sections" | "pages" | "media" | "site" | "history";
type Device = "desktop" | "tablet" | "mobile";
type Dialog =
  | { kind: "image"; path: Path; current: ImageRef }
  | ({ kind: "link" } & LinkTarget)
  | { kind: "add"; index: number }
  | { kind: "page" }
  | { kind: "team"; path: Path }
  | ({ kind: "confirm" } & ConfirmRequest)
  | null;
type LinkTarget = { path: Path; current: LinkRef };
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
const PHONE_QUERY = "(max-width: 820px)";
const LOAD_FAILED_HELP = "Your saved draft is safe. Reload to try again, and if this keeps happening, contact the website team.";

function withLink(content: SiteContent, { path, current: previous }: LinkTarget, link: LinkRef) {
  const next = setIn(content, path, link);
  const isNavLink = path[0] === "settings" && path[1] === "nav";
  if (!isNavLink || !content.settings.hiddenNav.includes(previous.href)) return next;
  const oldHrefStillUsed = next.settings.nav.some((item) => item.href === previous.href);
  const hiddenNav = [...new Set([...content.settings.hiddenNav.filter((href) => href !== previous.href || oldHrefStillUsed), link.href].filter(Boolean))];
  return { ...next, settings: { ...next.settings, hiddenNav } };
}

function saveStatus(saveState: SaveState, unpublished: boolean) {
  if (saveState === "failed") return { icon: <TriangleAlert aria-hidden />, text: "Draft not saved", tone: "error" };
  if (saveState === "pending" || saveState === "saving") return { icon: <Loader2 className="st-spin" aria-hidden />, text: "Saving draft…", tone: "" };
  if (unpublished) return { icon: <Pencil aria-hidden />, text: "Draft saved · ready to publish", tone: "draft" };
  return { icon: <Check aria-hidden />, text: "All changes are live", tone: "ok" };
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
          <ArrowUp aria-hidden />
        </button>
        <button type="button" title="Move section down" aria-label="Move section down" disabled={index === count - 1} onClick={() => actions.move(index, index + 1)}>
          <ArrowDown aria-hidden />
        </button>
        <button type="button" title={visibilityLabel} aria-label={visibilityLabel} onClick={() => actions.toggleVisible(index)}>
          {block.visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
        <button type="button" title="Duplicate section" aria-label="Duplicate section" onClick={() => actions.duplicate(index)}>
          <Copy aria-hidden />
        </button>
        <button type="button" title="Section settings" aria-label="Section settings" onClick={() => actions.select(block.id)}>
          <Settings2 aria-hidden />
        </button>
        <button type="button" title="Delete section" aria-label="Delete section" onClick={() => actions.remove(index)}>
          <Trash2 aria-hidden />
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
        <Plus aria-hidden /> Add section
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
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [preview, setPreview] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [publishing, setPublishing] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);

  const { toast, notify, dismiss, withdraw } = useToast();
  const { content, contentRef, history, load, commit, undo, redo } = useEditHistory();
  const { saveState, markSaved, retrySave } = useDraftAutosave({ content, contentRef, notify, withdraw });
  const { library, libraryError, loadLibrary } = useMediaLibrary();
  const canvasWidth = useElementWidth(canvas, INITIAL_CANVAS_WIDTH, !!content);
  useUndoShortcuts(undo, redo, !publishing);

  useEffect(() => {
    if (!window.matchMedia(PHONE_QUERY).matches) return;
    const timer = window.setTimeout(() => {
      setDevice("mobile");
      setPanelOpen(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
      <div className="studio st-fatal">
        <TriangleAlert aria-hidden />
        <h1>The studio couldn’t load</h1>
        <p>{loadError}</p>
        <p>{LOAD_FAILED_HELP}</p>
        <button type="button" className="st-btn" onClick={() => window.location.reload()}>
          <RotateCw aria-hidden /> Reload
        </button>
      </div>
    );
  if (!content || !published)
    return (
      <div className="studio st-fatal">
        <Loader2 className="st-spin" aria-hidden />
        <p>Loading the studio…</p>
      </div>
    );

  const page = content.pages[Math.min(pageIndex, content.pages.length - 1)];
  const pageBase: Path = ["pages", pageIndex];
  const membersPath = (index: number): Path => [...pageBase, "blocks", index, "data", "members"];
  const blockIndex = page.blocks.findIndex((block) => block.id === selected);
  const selectedBlock = blockIndex >= 0 ? page.blocks[blockIndex] : null;
  const unpublished = JSON.stringify(content) !== JSON.stringify(published);
  const dirty = saveState !== "saved";
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
  const deleteBlock = (index: number) =>
    setDialog({
      kind: "confirm",
      title: "Delete section",
      message: `Delete “${blockTitle(page.blocks[index])}” from this draft? The live site changes only after you publish. You can undo before publishing.`,
      confirmLabel: "Delete section",
      onConfirm: () => {
        setBlocks((blocks) => blocks.filter((_, i) => i !== index));
        setSelected(null);
        notify("Section deleted from draft. Publish to update the live site.");
      },
    });

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
    toggleVisible: (index) => {
      const visible = !page.blocks[index].visible;
      api.set([...pageBase, "blocks", index, "visible"], visible);
      notify(`Section ${visible ? "shown" : "hidden"} in draft. Publish to update the live site.`);
    },
    duplicate: duplicateBlock,
    remove: deleteBlock,
    insertAt: (index) => setDialog({ kind: "add", index }),
    manageTeam: (index) => {
      setSelected(page.blocks[index].id);
      setDialog({ kind: "team", path: membersPath(index) });
    },
  };

  const wrap: SectionWrapper = (block, index, node) => (
    <SectionFrame key={block.id} block={block} index={index} count={page.blocks.length} selected={selected === block.id} actions={sectionActions}>
      {node}
    </SectionFrame>
  );

  const publish = async () => {
    if (publishing || dirty || !unpublished) return;
    setPublishing(true);
    try {
      const body = await fetchJson<{ content: SiteContent }>("/api/content/publish", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ content, label: "" }),
      });
      setPublished(body.content);
      markSaved(content);
      notify("Published. Refresh the live page to see your changes.");
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
          <FileText aria-hidden />
          <select
            value={pageIndex}
            disabled={publishing}
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
          <button type="button" className="st-icon" onClick={undo} disabled={publishing || !history.canUndo} title="Undo (⌘Z)" aria-label="Undo">
            <Undo2 aria-hidden />
          </button>
          <button type="button" className="st-icon" onClick={redo} disabled={publishing || !history.canRedo} title="Redo (⌘⇧Z)" aria-label="Redo">
            <Redo2 aria-hidden />
          </button>
        </div>
        <div className="st-top-group st-devices" role="group" aria-label="Preview width">
          {DEVICES.map(({ id, Icon, label }) => (
            <button key={id} type="button" className="st-icon" aria-pressed={device === id} title={label} aria-label={`${label} preview`} onClick={() => setDevice(id)}>
              <Icon aria-hidden />
            </button>
          ))}
        </div>
        <span className="st-spacer" />
        <button type="button" className="st-btn" aria-pressed={preview} disabled={publishing} title={preview ? "Back to editing" : "Preview"} onClick={() => setPreview(!preview)}>
          {preview ? <Pencil aria-hidden /> : <Eye aria-hidden />}
          <span className="st-btn-label">{preview ? "Back to editing" : "Preview"}</span>
        </button>
        {!preview && <button type="button" className="st-btn st-inspector-toggle" aria-expanded={inspectorOpen} aria-controls="studio-inspector" disabled={publishing} onClick={() => setInspectorOpen(!inspectorOpen)}><Settings2 aria-hidden /> {inspectorOpen ? "Close details" : "Details"}</button>}
        <a className="st-btn" href={`/${page.slug}`} target="_blank" rel="noreferrer" title="View live">
          <ExternalLink aria-hidden />
          <span className="st-btn-label">View live</span>
        </a>
        <SignOut disabled={publishing || dirty} onError={(message) => notify(message, "error")} />
        <span className={`st-status st-status-${status.tone}`} role="status">
          {status.icon}
          {status.text}
        </span>
        {saveState === "failed" && <button type="button" className="st-btn st-btn-small" onClick={() => void retrySave()}>Retry save</button>}
        <button type="button" className="st-btn st-btn-primary" onClick={publish} disabled={publishing || !unpublished || dirty} title={dirty ? "Wait until the draft is saved" : !unpublished ? "There are no unpublished changes" : "Publish all draft changes to the live site"}>
          {publishing ? <Loader2 className="st-spin" aria-hidden /> : <Upload aria-hidden />} Publish
        </button>
      </header>

      <EditProvider value={api}>
        <div className="st-body" inert={publishing} aria-busy={publishing}>
          {!preview && (
            <aside className="st-left">
              <nav className="st-rail" aria-label="Studio panels">
                {PANELS.map(({ id, Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={panel === id && panelOpen}
                    aria-expanded={panel === id && panelOpen}
                    aria-controls="studio-panel"
                    title={panel === id && panelOpen ? "Click again to collapse" : undefined}
                    onClick={() => {
                      setPanelOpen(panel !== id || !panelOpen);
                      setPanel(id);
                    }}
                  >
                    <Icon aria-hidden />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
              <div id="studio-panel" className="st-panel" hidden={!panelOpen}>
                <button type="button" className="st-btn st-btn-small st-panel-close" onClick={() => setPanelOpen(false)}><X aria-hidden /> Close panel</button>
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
                      notify(`${label} restored into your draft. Use Undo to go back, or publish to make it live.`);
                    }}
                    onRevert={() =>
                      setDialog({
                        kind: "confirm",
                        title: "Discard unpublished changes",
                        message: "Discard all unpublished changes and go back to the live version? You can undo this until you publish.",
                        confirmLabel: "Discard changes",
                        onConfirm: () => {
                          commit(structuredClone(published));
                          notify("Draft reset to the live version.");
                        },
                      })
                    }
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
            <aside id="studio-inspector" className={inspectorOpen ? "st-right st-right-open" : "st-right"} aria-label="Inspector">
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
                  onTeamImport={() => setDialog({ kind: "team", path: membersPath(blockIndex) })}
                  onShowPage={() => setSelected(null)}
                />
              ) : (
                <PageInspector page={page} pageIndex={pageIndex} api={api} />
              )}
            </aside>
          )}
        </div>
        {!publishing && <RichToolbar />}

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
              commit((current) => withLink(current, dialog, link));
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
        {dialog?.kind === "confirm" && (
          <ConfirmDialog
            title={dialog.title}
            message={dialog.message}
            confirmLabel={dialog.confirmLabel}
            onConfirm={dialog.onConfirm}
            onClose={() => setDialog(null)}
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
        <div key={toast.tone ?? "info"} className={toast.tone === "error" ? "st-toast st-toast-error" : "st-toast"} role={toast.tone === "error" ? "alert" : "status"}>
          <span>{toast.text}</span>
          <button type="button" className="st-toast-close" aria-label="Dismiss message" onClick={dismiss}>
            <X aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
