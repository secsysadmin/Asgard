import { sanitizeHtml, safeHref } from "../sanitize";
import { blockSpecs, newBlockId, richKeys } from "./blocks";
import { defaultContent, defaultTeamBlock, teamPage } from "./defaults";
import { careerFairPoster, careerFairVideo } from "./hero-video";
import type { Block, BlockType, Page, SiteContent } from "./types";

export const RESERVED_SLUGS = new Set(["admin", "api", "student", "_next", "images"]);

const CONTENT_VERSION = 7;
const VERSION_WITH_SECTION_COLORS = 6;
const VERSION_WITH_HERO_DETAILS = 5;
const VERSION_WITH_EVENT_SECTION = 4;
const VERSION_WITH_TEAM_ON_HOME = 2;
const VERSION_WITH_OLD_TEAM_STYLE = 3;
const SUPPORTED_VERSIONS = new Set<unknown>([VERSION_WITH_TEAM_ON_HOME, VERSION_WITH_OLD_TEAM_STYLE, VERSION_WITH_EVENT_SECTION, VERSION_WITH_HERO_DETAILS, VERSION_WITH_SECTION_COLORS, CONTENT_VERSION]);
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
const HOME_HERO_ID = "home-hero";
const LEGACY_HOME_HEADING = "Career Fair";
const HOME_HEADING = "SEC Career Fair";
const DEFAULT_EVENT_HEADING = "Date, time & location";
const DEFAULT_EVENT_BODY = "<p>Join us in person at Legends Event Center, or online through HireAggies the day after.</p>";
const LEGACY_HERO_VIDEOS = new Map([
  ["/video/career-fair-1080.v1.mp4", careerFairVideo.src],
  ["/video/career-fair-720.v1.mp4", careerFairVideo.mobileSrc],
  ["/video/career-fair-1080.v1.webm", careerFairVideo.webmSrc],
  ["/video/career-fair-720.v1.webm", careerFairVideo.mobileWebmSrc],
  ["/video/career-fair-720.v2.webm", careerFairVideo.mobileWebmSrc],
]);
const LEGACY_HERO_IMAGE = /^(?:\/images\/career-fair-hero\.(?:png|webp)|\/video\/career-fair-poster\.v1\.jpg)$/;
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
  if (key === "href" || key.endsWith("Href") || key === "hiddenNav") return safeHref(value);
  if (key === "src" || key.endsWith("Src")) return safeSrc(value);
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

function upgradeHomeHero(input: Record<string, unknown>, data: Record<string, unknown>) {
  if (input.type !== "hero" || input.id !== HOME_HERO_ID || !isObject(input.data)) return;
  if (input.data.video === undefined) {
    data.video = { ...careerFairVideo };
  } else if (isObject(data.video)) {
    for (const [field, value] of Object.entries(data.video)) {
      if (typeof value === "string" && LEGACY_HERO_VIDEOS.has(value)) {
        data.video[field] = LEGACY_HERO_VIDEOS.get(value);
      }
    }
  }
  if (isObject(data.image) && typeof data.image.src === "string" && LEGACY_HERO_IMAGE.test(data.image.src)) {
    data.image = { ...careerFairPoster };
  }
}

function normalizeBlock(input: unknown): Block | null {
  if (!isObject(input) || !isBlockType(input.type)) return null;
  const type = input.type;
  const data = conform(input.data, blockSpecs[type].starter()) as Record<string, unknown>;
  upgradeHomeHero(input, data);
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
  if (isHome) {
    const index = blocks.findIndex((block) => block.id === "home-paths" && block.type === "pathways");
    if (index >= 0) blocks.splice(index, 1);
  }
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

function moveEventDetailsToHero(content: SiteContent) {
  const home = content.pages[0];
  const hero = home.blocks.find((block) => block.id === HOME_HERO_ID && block.type === "hero");
  const event = home.blocks.find((block) => block.id === "home-location" && block.type === "event");
  if (!hero || hero.type !== "hero" || !event || event.type !== "event") return;
  const dates = event.data.facts.find((item) => /^in-person dates$/i.test(item.label));
  const hours = event.data.facts.find((item) => /^hours$/i.test(item.label));
  const venue = event.data.facts.find((item) => /^venue$/i.test(item.label));
  const virtual = event.data.facts.find((item) => /^virtual fair$/i.test(item.label));
  const directions = event.data.links.find((item) => /^get directions$/i.test(item.label));
  const virtualLink = event.data.links.find((item) => /^hireaggies login$/i.test(item.label));
  hero.data.dates = dates?.value || hero.data.dates;
  hero.data.hours = hours?.value ?? "";
  hero.data.location = venue?.value || hero.data.location || directions?.label || "";
  hero.data.virtual = virtual?.value ? `Virtual fair: ${virtual.value}` : virtualLink?.label ?? "";
  hero.data.directionsHref = directions?.href ?? "";
  hero.data.virtualHref = virtualLink?.href ?? "";
  event.data.facts = event.data.facts.filter((item) => item !== dates && item !== hours && item !== venue && item !== virtual);
  event.data.links = event.data.links.filter((item) => item !== directions && item !== virtualLink);
  if (event.data.body === DEFAULT_EVENT_BODY) event.data.body = "";
  const hasCustomContent = event.data.heading !== DEFAULT_EVENT_HEADING || event.data.body || event.data.note || event.data.gallery.length || event.data.facts.length || event.data.links.length;
  if (!hasCustomContent) home.blocks = home.blocks.filter((block) => block !== event);
}

export function normalizeContent(input: unknown): SiteContent {
  if (!isObject(input) || !SUPPORTED_VERSIONS.has(input.version) || !Array.isArray(input.pages)) return structuredClone(defaultContent);
  const version = input.version;
  const pages = uniqueBy(input.pages.map((page, index) => normalizePage(page, index)), (page) => page.slug);
  if (!pages.length || pages[0].slug !== "") return structuredClone(defaultContent);
  const settings = conform(input.settings, defaultContent.settings) as SiteContent["settings"];
  settings.hiddenNav = [...new Set(settings.hiddenNav.filter((href) => typeof href === "string" && !!safeHref(href)))];
  let content: SiteContent = { version: CONTENT_VERSION, settings, pages };
  if (version === VERSION_WITH_TEAM_ON_HOME) content = moveTeamToOwnPage(content);
  if (version === VERSION_WITH_TEAM_ON_HOME || version === VERSION_WITH_OLD_TEAM_STYLE) content = restyleTeamPage(content);
  if (version === VERSION_WITH_TEAM_ON_HOME || version === VERSION_WITH_OLD_TEAM_STYLE || version === VERSION_WITH_EVENT_SECTION) moveEventDetailsToHero(content);
  if (version !== CONTENT_VERSION && version !== VERSION_WITH_SECTION_COLORS) {
    const blocks = content.pages[0].blocks;
    const index = blocks.findIndex((block) => block.id === "home-contact" && block.type === "contact" && block.tone === "tint");
    if (index > 0 && blocks[index - 1].id === "home-about" && blocks[index - 1].tone === "tint") blocks[index].tone = "plain";
  }
  if (version !== CONTENT_VERSION) {
    const hero = content.pages[0].blocks.find((block) => block.id === HOME_HERO_ID && block.type === "hero");
    if (hero?.type === "hero" && hero.data.emphasis === LEGACY_HOME_HEADING) hero.data.emphasis = HOME_HEADING;
  }
  return content;
}
