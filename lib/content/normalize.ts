import { sanitizeHtml, safeHref } from "../sanitize";
import { blockSpecs, richKeys } from "./blocks";
import { defaultContent } from "./defaults";
import type { Block, BlockType, Page, SiteContent } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const safeSrc = (src: string) =>
  /^(https:\/\/|\/(?!\/))/i.test(src.trim()) ? src.trim() : "";

/**
 * Coerce `input` into the shape of `shape`: missing keys come from the shape,
 * strings are sanitized by key, and arrays keep their items shaped like the
 * shape's first item (or like themselves when the shape list is empty).
 */
function conform(input: unknown, shape: unknown, key = ""): unknown {
  if (typeof shape === "string") {
    const value = typeof input === "string" ? input : shape;
    if (richKeys.has(key)) return sanitizeHtml(value);
    if (key === "href") return safeHref(value);
    if (key === "src") return safeSrc(value);
    return value.slice(0, 5000);
  }
  if (typeof shape === "boolean") return typeof input === "boolean" ? input : shape;
  if (Array.isArray(shape)) {
    if (!Array.isArray(input)) return shape;
    return input.slice(0, 200).map((item) => conform(item, shape[0] ?? item, key));
  }
  if (isObject(shape)) {
    const source = isObject(input) ? input : {};
    return Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, conform(source[k], v, k)]));
  }
  // Shape-less values (e.g. items of an empty starter list) keep plain data only.
  if (typeof input === "string") return conform(input, "", key);
  if (Array.isArray(input) || isObject(input)) return conform(input, input, key);
  return input;
}

function normalizeBlock(input: unknown): Block | null {
  if (!isObject(input) || typeof input.type !== "string" || !(input.type in blockSpecs)) return null;
  const type = input.type as BlockType;
  const starter = blockSpecs[type].starter();
  const tone = ["plain", "tint", "maroon"].includes(input.tone as string) ? input.tone : "plain";
  const data = conform(input.data, starter) as Record<string, unknown>;
  if (type === "callout" && !["info", "warning"].includes(data.tone as string)) data.tone = "info";
  return {
    id: typeof input.id === "string" && /^[\w-]{1,64}$/.test(input.id) ? input.id : `${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    visible: input.visible !== false,
    nav: typeof input.nav === "string" ? input.nav.slice(0, 80) : "",
    group: typeof input.group === "string" ? input.group.slice(0, 80) : "",
    tone,
    data,
  } as Block;
}

export const RESERVED_SLUGS = new Set(["admin", "api", "student", "_next", "images"]);

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizePage(input: unknown, index: number): Page | null {
  if (!isObject(input)) return null;
  const slug = index === 0 ? "" : slugify(String(input.slug ?? ""));
  if (index !== 0 && (!slug || RESERVED_SLUGS.has(slug))) return null;
  const seen = new Set<string>();
  const blocks = (Array.isArray(input.blocks) ? input.blocks : [])
    .map(normalizeBlock)
    .filter((block): block is Block => {
      if (!block || seen.has(block.id)) return false;
      seen.add(block.id);
      return true;
    });
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 64) : slug || "home",
    slug,
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim().slice(0, 120) : "Untitled page",
    description: typeof input.description === "string" ? input.description.slice(0, 300) : "",
    layout: input.layout === "guide" ? "guide" : "landing",
    blocks,
  };
}

/** Validate and sanitize untrusted content; falls back to defaults. */
export function normalizeContent(input: unknown): SiteContent {
  if (!isObject(input) || input.version !== 2 || !Array.isArray(input.pages)) return structuredClone(defaultContent);
  const slugs = new Set<string>();
  const pages = input.pages
    .map((page, index) => normalizePage(page, index))
    .filter((page): page is Page => {
      if (!page || slugs.has(page.slug)) return false;
      slugs.add(page.slug);
      return true;
    });
  if (!pages.length || pages[0].slug !== "") return structuredClone(defaultContent);
  const settings = conform(input.settings, defaultContent.settings) as SiteContent["settings"];
  return { version: 2, settings, pages };
}
