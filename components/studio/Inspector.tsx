"use client";
import { ArrowDown, ArrowUp, ChevronRight, Copy, ImagePlus, Link2, Plus, Trash2 } from "lucide-react";
import { richKeys, blockSpecs } from "@/lib/content/blocks";
import { slugify } from "@/lib/content/normalize";
import type { Block, ImageRef, LinkRef, Page } from "@/lib/content/types";
import { type EditApi, type Path, Rich } from "../edit/context";

const LABELS: Record<string, string> = {
  q: "Question",
  a: "Answer",
  href: "Link URL",
  src: "Image URL",
  meta: "Details",
  cta: "Main button",
  primary: "Primary button",
  secondary: "Secondary button",
  emphasis: "Headline emphasis (italic second line)",
  dates: "Dates",
  intro: "Introduction",
  note: "Highlighted note",
  summary: "Supporting text",
  facts: "Fact list",
  gallery: "Photos",
  cells: "Cells",
  people: "Phone contacts",
};

const human = (key: string) =>
  LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const isImage = (value: unknown): value is ImageRef =>
  !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join() === "alt,src";
const isLink = (value: unknown): value is LinkRef =>
  !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join() === "href,label";

function itemTitle(value: unknown, index: number): string {
  if (typeof value === "string") return value || `Item ${index + 1}`;
  if (value && typeof value === "object") {
    const first = Object.values(value).find((v) => typeof v === "string" && v.trim() && !v.startsWith("<") && !v.startsWith("/"));
    if (typeof first === "string") return first.length > 48 ? `${first.slice(0, 48)}…` : first;
  }
  return `Item ${index + 1}`;
}

function Field({ value, path, name, api }: { value: unknown; path: Path; name: string; api: EditApi }) {
  if (typeof value === "string") {
    if (richKeys.has(name))
      return (
        <div className="st-field">
          <span>{human(name)}</span>
          <Rich value={value} path={path} className="st-rich-input" placeholder={`${human(name)} (optional)`} />
        </div>
      );
    if (name === "tone")
      return (
        <label className="st-field">
          <span>Style</span>
          <select value={value} onChange={(event) => api.set(path, event.target.value)}>
            <option value="info">Note</option>
            <option value="warning">Warning</option>
          </select>
        </label>
      );
    return (
      <label className="st-field">
        <span>{human(name)}</span>
        <input value={value} onChange={(event) => api.set(path, event.target.value)} />
      </label>
    );
  }
  if (isImage(value))
    return (
      <div className="st-field">
        <span>{human(name)}</span>
        <button type="button" className="st-image-field" onClick={() => api.pickImage(path, value)}>
          {value.src ? <img src={value.src} alt="" /> : <ImagePlus />}
          <span>{value.src ? value.alt || "No alt text — add one" : "Choose image"}</span>
        </button>
      </div>
    );
  if (isLink(value))
    return (
      <div className="st-field">
        <span>{human(name)}</span>
        <button type="button" className="st-link-field" onClick={() => api.editLink(path, value)}>
          <Link2 />
          <span>
            <strong>{value.label || "No text"}</strong>
            <small>{value.href || "No destination"}</small>
          </span>
        </button>
      </div>
    );
  if (Array.isArray(value))
    return (
      <div className="st-field">
        <span>
          {human(name)} <em>({value.length})</em>
        </span>
        <ol className="st-array">
          {value.map((item, i) => (
            <li key={i}>
              <details>
                <summary>
                  <ChevronRight className="st-caret" />
                  <span>{itemTitle(item, i)}</span>
                  <span className="st-array-tools" onClick={(event) => event.preventDefault()}>
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => api.moveItem(path, i, i - 1)}>
                      <ArrowUp />
                    </button>
                    <button type="button" aria-label="Move down" disabled={i === value.length - 1} onClick={() => api.moveItem(path, i, i + 1)}>
                      <ArrowDown />
                    </button>
                    <button type="button" aria-label="Duplicate" onClick={() => api.duplicateItem(path, i)}>
                      <Copy />
                    </button>
                    <button type="button" aria-label="Delete" onClick={() => api.removeItem(path, i)}>
                      <Trash2 />
                    </button>
                  </span>
                </summary>
                <div className="st-array-body">
                  <Field value={item} path={[...path, i]} name={name === "columns" ? "column" : name === "cells" ? "cell" : "item"} api={api} />
                </div>
              </details>
            </li>
          ))}
        </ol>
        <button type="button" className="st-btn st-btn-quiet st-btn-small" onClick={() => api.insertItem(path, value.length)}>
          <Plus /> Add
        </button>
      </div>
    );
  if (value && typeof value === "object")
    return (
      <div className="st-object">
        {Object.entries(value).map(([key, child]) => (
          <Field key={key} value={child} path={[...path, key]} name={key} api={api} />
        ))}
      </div>
    );
  return null;
}

export function BlockInspector({
  block,
  index,
  pageIndex,
  page,
  api,
  onDelete,
  onDuplicate,
}: {
  block: Block;
  index: number;
  pageIndex: number;
  page: Page;
  api: EditApi;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const base: Path = ["pages", pageIndex, "blocks", index];
  const groups = [...new Set(page.blocks.map((b) => b.group).filter(Boolean))];
  const idTaken = (id: string) => page.blocks.some((b, i) => i !== index && b.id === id);
  return (
    <div className="st-inspector-body">
      <p className="st-kicker">{blockSpecs[block.type].label}</p>
      <p className="st-tip">Click any text on the page to type over it. Use this panel for links, image descriptions, and section settings.</p>
      <section className="st-group">
        <h3>Section settings</h3>
        <label className="st-check">
          <input type="checkbox" checked={block.visible} onChange={(event) => api.set([...base, "visible"], event.target.checked)} />
          <span>Visible on the live site</span>
        </label>
        {page.layout === "guide" && (
          <>
            <label className="st-field">
              <span>Label in “On this page” menu</span>
              <input value={block.nav} placeholder="Leave empty to keep out of the menu" onChange={(event) => api.set([...base, "nav"], event.target.value)} />
            </label>
            <label className="st-field">
              <span>Menu group</span>
              <input list="st-groups" value={block.group} onChange={(event) => api.set([...base, "group"], event.target.value)} />
              <datalist id="st-groups">
                {groups.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
            </label>
          </>
        )}
        <label className="st-field">
          <span>Background</span>
          <select value={block.tone} onChange={(event) => api.set([...base, "tone"], event.target.value)}>
            <option value="plain">Paper</option>
            <option value="tint">Cream</option>
            <option value="maroon">Maroon</option>
          </select>
        </label>
        <label className="st-field">
          <span>Anchor (for links to this section)</span>
          <input
            defaultValue={block.id}
            key={block.id}
            onBlur={(event) => {
              const id = slugify(event.target.value) || block.id;
              if (id !== block.id && !idTaken(id)) api.set([...base, "id"], id);
              event.target.value = idTaken(id) ? block.id : id;
            }}
          />
          <small>
            Link here with <code>/{page.slug}#{block.id}</code>
          </small>
        </label>
        <div className="st-row">
          <button type="button" className="st-btn st-btn-small" onClick={onDuplicate}>
            <Copy /> Duplicate
          </button>
          <button type="button" className="st-btn st-btn-small st-btn-danger-quiet" onClick={onDelete}>
            <Trash2 /> Delete section
          </button>
        </div>
      </section>
      <section className="st-group">
        <h3>Content</h3>
        <Field value={block.data} path={[...base, "data"]} name="data" api={api} />
      </section>
    </div>
  );
}
