"use client";
import { Plus, Trash2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createBlock } from "@/lib/content/blocks";
import { RESERVED_SLUGS, slugify } from "@/lib/content/normalize";
import type { Page, SiteContent } from "@/lib/content/types";
import type { Path } from "@/lib/studio/paths";
import { type EditApi, List as EditableList, Lnk, Rich } from "../edit/context";
import { Modal } from "./dialogs";

export function PageSettings({ page, pageIndex, api }: { page: Page; pageIndex: number; api: EditApi }) {
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

export function PagesPanel({
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
  // The studio remounts this panel per page (key={page.id}), so local state starts fresh.
  const [slug, setSlug] = useState(page.slug);
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

export function NewPageDialog({
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
    if (header.type === "pageHeader") header.data = { eyebrow: "", title: title.trim(), intro: "<p>Introduce this page.</p>", facts: [], links: [] };
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

export function SitePanel({ content, api }: { content: SiteContent; api: EditApi }) {
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

export function HistoryPanel({
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
