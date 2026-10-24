import { sanitizeHtml, safeHref } from "../sanitize";
import { blockSpecs, richKeys } from "./blocks";
import { defaultContent, teamPage } from "./defaults";
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
    if (richKeys.has(key)) return sanitizeHtml(value.slice(0, 20_000));
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

function moveTeamToOwnPage(content: SiteContent): SiteContent {
  const { pages, settings } = content;
  if (!pages.some((page) => page.slug === "team")) {
    const home = pages[0];
    const at = home.blocks.findIndex((block) => block.type === "team");
    const fallback = defaultContent.pages.find((page) => page.slug === "team")!.blocks[1];
    const members = structuredClone(at >= 0 ? home.blocks.splice(at, 1)[0] : fallback) as Block<"team">;
    const intro = members.data.intro;
    const page = teamPage({ ...members, visible: true, nav: "", group: "", data: { ...members.data, intro: "" } });
    const header = page.blocks[0];
    if (intro && header.type === "pageHeader") header.data.intro = intro;
    pages.push(page);
  }
  if (!settings.nav.some((link) => link.href.split("#")[0] === "/team")) {
    const external = settings.nav.findIndex((link) => /^https?:/i.test(link.href));
    settings.nav.splice(external < 0 ? settings.nav.length : external, 0, { label: "Meet the Team", href: "/team" });
  }
  return content;
}

function restyleTeamPage(content: SiteContent): SiteContent {
  const page = content.pages.find((candidate) => candidate.slug === "team");
  for (const block of page?.blocks ?? []) {
    if (block.id === "team-header" && block.tone === "plain") block.tone = "maroon";
    if (block.type === "team" && block.tone === "maroon") {
      block.tone = "plain";
      if (block.data.heading === "Students running the whole show") block.data.heading = "";
    }
  }
  return content;
}

/** Validate and sanitize untrusted content; falls back to defaults. */
export function normalizeContent(input: unknown): SiteContent {
  const version = isObject(input) ? input.version : null;
  if (!isObject(input) || (version !== 2 && version !== 3 && version !== 4) || !Array.isArray(input.pages)) return structuredClone(defaultContent);
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
  let content: SiteContent = { version: 4, settings, pages };
  if (version === 2) content = moveTeamToOwnPage(content);
  if (version === 2 || version === 3) content = restyleTeamPage(content);
  return content;
}
