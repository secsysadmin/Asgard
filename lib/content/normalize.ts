import { sanitizeHtml, safeHref } from "../sanitize";
import { blockSpecs, newBlockId, richKeys } from "./blocks";
import { defaultContent, defaultTeamBlock, teamPage } from "./defaults";
import type { Block, BlockType, Page, SiteContent } from "./types";

export const RESERVED_SLUGS = new Set(["admin", "api", "student", "_next", "images"]);

const CONTENT_VERSION = 4;
const VERSION_WITH_TEAM_ON_HOME = 2;
const VERSION_WITH_OLD_TEAM_STYLE = 3;
const SUPPORTED_VERSIONS = new Set<unknown>([VERSION_WITH_TEAM_ON_HOME, VERSION_WITH_OLD_TEAM_STYLE, CONTENT_VERSION]);
const MAX_RICH_TEXT_LENGTH = 20_000;
const MAX_TEXT_LENGTH = 5000;
const MAX_LIST_ITEMS = 200;
const MAX_LABEL_LENGTH = 80;
const MAX_ID_LENGTH = 64;
const MAX_SLUG_LENGTH = 60;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 300;
const BLOCK_ID = /^[\w-]{1,64}$/;
const BLOCK_TONES: readonly Block["tone"][] = ["plain", "tint", "maroon"];
const CALLOUT_TONES: readonly unknown[] = ["info", "warning"];
const UNTITLED_PAGE = "Untitled page";
const HOME_PAGE_ID = "home";
const TEAM_SLUG = "team";
const TEAM_HREF = "/team";
const TEAM_NAV_LABEL = "Meet the Team";
const TEAM_HEADER_ID = "team-header";
const LEGACY_TEAM_HEADING = "Students running the whole show";

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isBlockType = (value: unknown): value is BlockType => typeof value === "string" && value in blockSpecs;

const isTone = (value: unknown): value is Block["tone"] => BLOCK_TONES.some((tone) => tone === value);

const isTeamBlock = (block: Block): block is Block<"team"> => block.type === "team";

const safeSrc = (src: string) =>
  /^(https:\/\/|\/(?!\/))/i.test(src.trim()) ? src.trim() : "";

const optionalText = (value: unknown, maxLength: number) => (typeof value === "string" ? value.slice(0, maxLength) : "");

function conformString(value: string, key: string) {
  if (richKeys.has(key)) return sanitizeHtml(value.slice(0, MAX_RICH_TEXT_LENGTH));
  if (key === "href") return safeHref(value);
  if (key === "src") return safeSrc(value);
  return value.slice(0, MAX_TEXT_LENGTH);
}

function conform(input: unknown, shape: unknown, key = ""): unknown {
  if (typeof shape === "string") return conformString(typeof input === "string" ? input : shape, key);
  if (typeof shape === "boolean") return typeof input === "boolean" ? input : shape;
  if (Array.isArray(shape)) {
    if (!Array.isArray(input)) return shape;
    return input.slice(0, MAX_LIST_ITEMS).map((item) => conform(item, shape[0] ?? item, key));
  }
  if (isObject(shape)) {
    const source = isObject(input) ? input : {};
    return Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, conform(source[k], v, k)]));
  }
  if (typeof input === "string") return conform(input, "", key);
  if (Array.isArray(input) || isObject(input)) return conform(input, input, key);
  return input;
}

function normalizeBlock(input: unknown): Block | null {
  if (!isObject(input) || !isBlockType(input.type)) return null;
  const type = input.type;
  const data = conform(input.data, blockSpecs[type].starter()) as Record<string, unknown>;
  if (type === "callout" && !CALLOUT_TONES.includes(data.tone)) data.tone = "info";
  return {
    id: typeof input.id === "string" && BLOCK_ID.test(input.id) ? input.id : newBlockId(type),
    type,
    visible: input.visible !== false,
    nav: optionalText(input.nav, MAX_LABEL_LENGTH),
    group: optionalText(input.group, MAX_LABEL_LENGTH),
    tone: isTone(input.tone) ? input.tone : "plain",
    data,
  } as Block;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);
}

function uniqueBy<T>(items: (T | null)[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item): item is T => {
    if (!item || seen.has(keyOf(item))) return false;
    seen.add(keyOf(item));
    return true;
  });
}

function normalizePage(input: unknown, index: number): Page | null {
  if (!isObject(input)) return null;
  const isHome = index === 0;
  const slug = isHome ? "" : slugify(String(input.slug ?? ""));
  if (!isHome && (!slug || RESERVED_SLUGS.has(slug))) return null;
  const blocks = uniqueBy((Array.isArray(input.blocks) ? input.blocks : []).map(normalizeBlock), (block) => block.id);
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, MAX_ID_LENGTH) : slug || HOME_PAGE_ID,
    slug,
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim().slice(0, MAX_TITLE_LENGTH) : UNTITLED_PAGE,
    description: optionalText(input.description, MAX_DESCRIPTION_LENGTH),
    layout: input.layout === "guide" ? "guide" : "landing",
    blocks,
  };
}

function takeHomeTeamBlock(home: Page): Block<"team"> {
  const homeTeam = home.blocks.find(isTeamBlock);
  if (!homeTeam) return structuredClone(defaultTeamBlock);
  home.blocks.splice(home.blocks.indexOf(homeTeam), 1);
  return structuredClone(homeTeam);
}

function moveTeamToOwnPage(content: SiteContent): SiteContent {
  const { pages, settings } = content;
  if (!pages.some((page) => page.slug === TEAM_SLUG)) {
    const members = takeHomeTeamBlock(pages[0]);
    const intro = members.data.intro;
    const page = teamPage({ ...members, visible: true, nav: "", group: "", data: { ...members.data, intro: "" } });
    const header = page.blocks[0];
    if (intro && header.type === "pageHeader") header.data.intro = intro;
    pages.push(page);
  }
  if (!settings.nav.some((link) => link.href.split("#")[0] === TEAM_HREF)) {
    const external = settings.nav.findIndex((link) => /^https?:/i.test(link.href));
    settings.nav.splice(external < 0 ? settings.nav.length : external, 0, { label: TEAM_NAV_LABEL, href: TEAM_HREF });
  }
  return content;
}

function restyleTeamPage(content: SiteContent): SiteContent {
  const page = content.pages.find((candidate) => candidate.slug === TEAM_SLUG);
  for (const block of page?.blocks ?? []) {
    if (block.id === TEAM_HEADER_ID && block.tone === "plain") block.tone = "maroon";
    if (block.type === "team" && block.tone === "maroon") {
      block.tone = "plain";
      if (block.data.heading === LEGACY_TEAM_HEADING) block.data.heading = "";
    }
  }
  return content;
}

export function normalizeContent(input: unknown): SiteContent {
  if (!isObject(input) || !SUPPORTED_VERSIONS.has(input.version) || !Array.isArray(input.pages)) return structuredClone(defaultContent);
  const version = input.version;
  const pages = uniqueBy(input.pages.map((page, index) => normalizePage(page, index)), (page) => page.slug);
  if (!pages.length || pages[0].slug !== "") return structuredClone(defaultContent);
  const settings = conform(input.settings, defaultContent.settings) as SiteContent["settings"];
  let content: SiteContent = { version: CONTENT_VERSION, settings, pages };
  if (version === VERSION_WITH_TEAM_ON_HOME) content = moveTeamToOwnPage(content);
  if (version === VERSION_WITH_TEAM_ON_HOME || version === VERSION_WITH_OLD_TEAM_STYLE) content = restyleTeamPage(content);
  return content;
}
