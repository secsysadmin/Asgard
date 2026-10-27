"use client";
import { Eye, EyeOff, GripVertical, Plus, Trash2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { blockSpecs, createBlock, newBlockId } from "@/lib/content/blocks";
import { RESERVED_SLUGS, slugify } from "@/lib/content/normalize";
import type { Block, Page, SiteContent } from "@/lib/content/types";
import { blockTitle } from "@/lib/studio/content-ops";
import type { Path } from "@/lib/studio/paths";
import { type EditApi, List as EditableList, Lnk, Rich } from "../edit/context";
import { Modal } from "./dialogs";
import { pageName } from "./labels";
import { errorMessage, fetchJson } from "./request";

export type SectionActions = {
  select: (id: string) => void;
  reveal: (id: string) => void;
  move: (from: number, to: number) => void;
  toggleVisible: (index: number) => void;
  duplicate: (index: number) => void;
  remove: (index: number) => void;
  insertAt: (index: number) => void;
};
type SectionsPanelProps = { blocks: Block[]; selected: string | null; actions: SectionActions };
type PageSettingsProps = { page: Page; pageIndex: number; api: EditApi };
type PagesPanelProps = {
  content: SiteContent;
  pageIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  commit: (update: (c: SiteContent) => SiteContent) => void;
  api: EditApi;
};
type NewPageStart = "blank" | "copy";
type NewPageDialogProps = {
  content: SiteContent;
  currentPage: Page;
  onClose: () => void;
  onCreate: (page: Page, addToNav: boolean) => void;
};
type SitePanelProps = { content: SiteContent; api: EditApi };
type HistoryPanelProps = {
  onRestore: (content: SiteContent, label: string) => void;
  onRevert: () => void;
  unpublished: boolean;
};
type Revision = { id: number; label: string; created_at: string };
type DragState = { from: number; over: number };

const RECOMMENDED_DESCRIPTION_LENGTH = 160;
const NEW_PAGE_FIRST_SECTION_NAV = "Overview";
const REVISION_DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

function dropClass(drag: DragState | null, index: number) {
  if (drag?.over !== index || drag.from === index) return false;
  return drag.from < index ? "drop-after" : "drop-before";
}

export function SectionsPanel({ blocks, selected, actions }: SectionsPanelProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const selectedIndex = blocks.findIndex((block) => block.id === selected);
  return (
    <>
      <div className="st-panel-head">
        <h2>Sections</h2>
        <p>Drag to reorder. Click to edit.</p>
      </div>
      <ol className="st-outline">
        {blocks.map((block, index) => (
          <li
            key={block.id}
            draggable
            className={[selected === block.id && "active", !block.visible && "is-hidden", dropClass(drag, index)].filter(Boolean).join(" ")}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", block.id);
              setDrag({ from: index, over: index });
            }}
            onDragOver={(event) => {
              if (!drag) return;
              event.preventDefault();
              if (drag.over !== index) setDrag({ ...drag, over: index });
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (drag && drag.from !== index) actions.move(drag.from, index);
              setDrag(null);
            }}
            onDragEnd={() => setDrag(null)}
          >
            <button
              type="button"
              className="st-outline-item"
              onClick={() => actions.reveal(block.id)}
              onKeyDown={(event) => {
                if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                event.preventDefault();
                actions.move(index, index + (event.key === "ArrowUp" ? -1 : 1));
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
              onClick={() => actions.toggleVisible(index)}
            >
              {block.visible ? <Eye /> : <EyeOff />}
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="st-btn st-btn-block" onClick={() => actions.insertAt(selectedIndex >= 0 ? selectedIndex + 1 : blocks.length)}>
        <Plus /> Add section
      </button>
    </>
  );
}

export function PageSettings({ page, pageIndex, api }: PageSettingsProps) {
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
        <small>{`${page.description.length}/${RECOMMENDED_DESCRIPTION_LENGTH} characters recommended.`}</small>
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

function slugError(content: SiteContent, slug: string, pageIndex: number) {
  if (!slug) return "Enter a URL";
  if (RESERVED_SLUGS.has(slug)) return "That URL is reserved";
  if (content.pages.some((p, i) => i !== pageIndex && p.slug === slug)) return "Another page uses this URL";
  return "";
}

export function PagesPanel({ content, pageIndex, onSelect, onAdd, commit, api }: PagesPanelProps) {
  const page = content.pages[pageIndex];
  const [slug, setSlug] = useState(page.slug);
  const error = slugError(content, slug, pageIndex);
  const deletePage = () => {
    if (!confirm(`Delete the “${page.title}” page? It will disappear from the live site when you publish.`)) return;
    onSelect(0);
    commit((c) => ({ ...c, pages: c.pages.filter((_, i) => i !== pageIndex) }));
  };
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
              <strong>{pageName(p)}</strong>
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
            {error ? <small className="st-error">{error}</small> : <small>Changing this breaks old links to the page.</small>}
          </label>
          <div className="st-row">
            <button type="button" className="st-btn st-btn-small" disabled={!!error || slug === page.slug} onClick={() => api.set(["pages", pageIndex, "slug"], slug)}>
              Save URL
            </button>
            <button type="button" className="st-btn st-btn-small st-btn-danger-quiet" onClick={deletePage}>
              <Trash2 /> Delete page
            </button>
          </div>
        </section>
      )}
    </>
  );
}

function newPageError(content: SiteContent, title: string, slug: string) {
  if (!title.trim()) return "";
  if (!slug) return "Enter a URL";
  if (RESERVED_SLUGS.has(slug) || content.pages.some((p) => p.slug === slug)) return "That URL is already used";
  return "";
}

function starterBlocks(title: string): Block[] {
  const header = createBlock("pageHeader");
  if (header.type === "pageHeader") header.data = { ...header.data, eyebrow: "", title };
  return [header, { ...createBlock("text"), nav: NEW_PAGE_FIRST_SECTION_NAV }];
}

export function NewPageDialog({ content, currentPage, onClose, onCreate }: NewPageDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [layout, setLayout] = useState<Page["layout"]>("guide");
  const [start, setStart] = useState<NewPageStart>("blank");
  const [addToNav, setAddToNav] = useState(true);
  const finalSlug = touched ? slug : slugify(title);
  const error = newPageError(content, title, finalSlug);
  const create = () => {
    const blocks = start === "copy" ? structuredClone(currentPage.blocks) : starterBlocks(title.trim());
    onCreate({ id: newBlockId("page"), slug: finalSlug, title: title.trim(), description: "", layout, blocks }, addToNav);
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
        <select value={start} onChange={(event) => setStart(event.target.value as NewPageStart)}>
          <option value="blank">A blank page</option>
          <option value="copy">A copy of “{pageName(currentPage)}”</option>
        </select>
      </label>
      <label className="st-check">
        <input type="checkbox" checked={addToNav} onChange={(event) => setAddToNav(event.target.checked)} />
        <span>Add to the main menu</span>
      </label>
    </Modal>
  );
}

export function SitePanel({ content, api }: SitePanelProps) {
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

export function HistoryPanel({ onRestore, onRevert, unpublished }: HistoryPanelProps) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchJson<Revision[]>("/api/content/revisions")
      .then(setRevisions)
      .catch((reason) => {
        setRevisions([]);
        setError(errorMessage(reason, "Couldn’t load the publish history."));
      });
  }, []);
  const restore = async (id: number, when: string) => {
    setError("");
    try {
      onRestore(await fetchJson<SiteContent>(`/api/content/revisions/${id}`), `The version from ${when}`);
    } catch (reason) {
      setError(errorMessage(reason, "Couldn’t load that version."));
    }
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
        {error && <p className="st-error">{error}</p>}
        {revisions === null ? (
          <p className="st-muted">Loading…</p>
        ) : revisions.length === 0 ? (
          !error && <p className="st-muted">Nothing published from the studio yet.</p>
        ) : (
          <ol className="st-history">
            {revisions.map((revision, i) => {
              const when = new Date(revision.created_at).toLocaleString(undefined, REVISION_DATE_FORMAT);
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
