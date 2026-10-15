import { stripHtml } from "../sanitize";
import { faqItemId } from "./anchors";
import type { Block, Page, SiteContent } from "./types";

// Site-wide search over the published content. Every visible section becomes
// an entry, and so does each titled item inside it (an FAQ question, a
// schedule row, a card, a hotel), so results land on the exact spot.

export type SearchEntry = {
  page: string;
  section: string;
  title: string;
  text: string;
  href: string;
};

const TITLE_KEYS = ["title", "q", "event", "name", "heading", "label", "date"] as const;
const SKIP_KEYS = new Set(["src", "alt", "href", "id", "tone"]);

const clean = (value: string) =>
  stripHtml(value)
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?)])/g, "$1")
    .trim();

/** All readable text in a value, excluding URLs and image paths. */
function textOf(value: unknown, key = ""): string[] {
  if (SKIP_KEYS.has(key)) return [];
  if (typeof value === "string") return value ? [clean(value)] : [];
  if (Array.isArray(value)) return value.flatMap((item) => textOf(item, key));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => textOf(v, k));
  return [];
}

function itemTitle(item: Record<string, unknown>): string {
  for (const key of TITLE_KEYS) if (typeof item[key] === "string" && item[key]) return clean(item[key] as string);
  if (Array.isArray(item.cells) && typeof item.cells[0] === "string") return item.cells[0];
  return "";
}

function sectionTitle(block: Block, page: Page): string {
  const data = block.data as Record<string, unknown>;
  if (block.nav) return block.nav;
  for (const key of ["heading", "title"]) if (typeof data[key] === "string" && data[key]) return data[key] as string;
  return page.title;
}

// Small lists that describe their parent rather than standing on their own.
const DETAIL_LISTS = new Set(["facts", "stats", "links", "gallery", "images", "columns", "cells"]);

/** Text that belongs to a record itself: plain fields plus its detail lists. */
function ownText(record: Record<string, unknown>, exclude = ""): string {
  return Object.entries(record)
    .filter(([key, value]) => typeof value === "string" || DETAIL_LISTS.has(key) || (value && typeof value === "object" && !Array.isArray(value)))
    .flatMap(([key, value]) => textOf(value, key))
    .filter((part) => part && part !== exclude)
    .join(" · ");
}

export function buildSearchIndex(content: SiteContent): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const page of content.pages) {
    const pageTitle = page.slug ? page.title : "Home";
    const base = `/${page.slug}`;
    for (const block of page.blocks) {
      if (!block.visible) continue;
      const section = sectionTitle(block, page);
      const href = block.type === "hero" || block.type === "pageHeader" ? base : `${base}#${block.id}`;
      const data = block.data as Record<string, unknown>;
      const push = (title: string, text: string, target = href) => entries.push({ page: pageTitle, section, title, text, href: target });
      push(section, ownText(data, section));

      if (block.type === "faq") {
        block.data.groups.forEach((group, gi) =>
          group.items.forEach((item, qi) => push(item.q, clean(item.a), `${base}#${faqItemId(block.id, gi, qi)}`)),
        );
        continue;
      }
      // Titled items inside lists (cards, rows, steps, days, people), and
      // titled items nested inside those (a day's individual events).
      const walk = (record: Record<string, unknown>) => {
        for (const [key, value] of Object.entries(record)) {
          if (!Array.isArray(value) || DETAIL_LISTS.has(key)) continue;
          for (const item of value) {
            if (!item || typeof item !== "object" || Array.isArray(item)) continue;
            const child = item as Record<string, unknown>;
            const title = itemTitle(child);
            if (title) push(title, ownText(child, title));
            walk(child);
          }
        }
      };
      walk(data);
    }
  }
  return entries;
}

const fold = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'").toLowerCase();

export function tokenize(query: string) {
  return fold(query).split(/[^a-z0-9&'#+.-]+/).filter((term) => term.length > 0);
}

export type SearchResult = SearchEntry & { score: number };

export function search(index: SearchEntry[], query: string, limit = 24): SearchResult[] {
  const terms = tokenize(query);
  if (!terms.length) return [];
  const results: SearchResult[] = [];
  for (const entry of index) {
    const title = fold(entry.title);
    const section = fold(entry.section);
    const text = fold(entry.text);
    let score = 0;
    let all = true;
    for (const term of terms) {
      const inTitle = title.includes(term);
      const inSection = section.includes(term);
      const inText = text.includes(term);
      if (!inTitle && !inSection && !inText && !fold(entry.page).includes(term)) {
        all = false;
        break;
      }
      const wordStart = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
      if (inTitle) score += wordStart.test(title) ? 12 : 6;
      if (inSection) score += 4;
      if (inText) score += wordStart.test(text) ? 2 : 1;
    }
    if (!all) continue;
    if (title === fold(query.trim())) score += 20;
    results.push({ ...entry, score });
  }
  // Best first; drop exact duplicates that point at the same place.
  const seen = new Set<string>();
  return results
    .sort((a, b) => b.score - a.score)
    .filter((result) => {
      const key = `${result.href}|${result.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/** A short excerpt of `text` around the first matching term. */
export function snippet(text: string, query: string, length = 150): string {
  if (text.length <= length) return text;
  const folded = fold(text);
  const hit = tokenize(query)
    .map((term) => folded.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  if (hit === undefined) return `${text.slice(0, length).trimEnd()}…`;
  const start = Math.max(0, hit - 40);
  return `${start > 0 ? "…" : ""}${text.slice(start, start + length).trim()}${start + length < text.length ? "…" : ""}`;
}
