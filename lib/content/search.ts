import { stripHtml } from "../sanitize";
import { faqItemId } from "./anchors";
import type { Block, Page, SiteContent } from "./types";

type SearchEntry = {
  page: string;
  section: string;
  title: string;
  text: string;
  href: string;
};

export type SearchResult = SearchEntry & { score: number };

type Fields = { [key: string]: unknown };

const TITLE_KEYS = ["title", "q", "event", "name", "heading", "label", "date"] as const;
const SECTION_TITLE_KEYS = ["heading", "title"] as const;
const SKIP_KEYS = new Set(["src", "alt", "href", "id", "tone"]);
const DETAIL_LISTS = new Set(["facts", "stats", "links", "gallery", "images", "columns", "cells"]);
const HOME_PAGE_TITLE = "Home";
const DEFAULT_RESULT_LIMIT = 24;
const DEFAULT_SNIPPET_LENGTH = 150;
const SNIPPET_LEAD_IN = 40;
const SCORE_TITLE_WORD_START = 12;
const SCORE_TITLE = 6;
const SCORE_SECTION = 4;
const SCORE_TEXT_WORD_START = 2;
const SCORE_TEXT = 1;
const SCORE_EXACT_TITLE = 20;

const clean = (value: string) =>
  stripHtml(value)
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?)])/g, "$1")
    .trim();

const fold = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'").toLowerCase();

const isFieldObject = (value: unknown): value is Fields => !!value && typeof value === "object" && !Array.isArray(value);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function textOf(value: unknown, key = ""): string[] {
  if (SKIP_KEYS.has(key)) return [];
  if (typeof value === "string") return value ? [clean(value)] : [];
  if (Array.isArray(value)) return value.flatMap((item) => textOf(item, key));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => textOf(v, k));
  return [];
}

function itemTitle(item: Fields): string {
  for (const key of TITLE_KEYS) {
    const value = item[key];
    if (typeof value === "string" && value) return clean(value);
  }
  if (Array.isArray(item.cells) && typeof item.cells[0] === "string") return item.cells[0];
  return "";
}

function sectionTitle(block: Block, page: Page): string {
  const data: Fields = block.data;
  if (block.nav) return block.nav;
  for (const key of SECTION_TITLE_KEYS) {
    const value = data[key];
    if (typeof value === "string" && value) return value;
  }
  return page.title;
}

function ownText(record: Fields, exclude = ""): string {
  return Object.entries(record)
    .filter(([key, value]) => typeof value === "string" || DETAIL_LISTS.has(key) || isFieldObject(value))
    .flatMap(([key, value]) => textOf(value, key))
    .filter((part) => part && part !== exclude)
    .join(" · ");
}

function titledItems(record: Fields): Fields[] {
  return Object.entries(record)
    .filter(([key, value]) => Array.isArray(value) && !DETAIL_LISTS.has(key))
    .flatMap(([, value]) => (Array.isArray(value) ? value.filter(isFieldObject) : []));
}

function blockEntries(block: Block, page: Page): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const pageTitle = page.slug ? page.title : HOME_PAGE_TITLE;
  const base = `/${page.slug}`;
  const section = sectionTitle(block, page);
  const href = block.type === "hero" || block.type === "pageHeader" ? base : `${base}#${block.id}`;
  const push = (title: string, text: string, target = href) => entries.push({ page: pageTitle, section, title, text, href: target });
  const data: Fields = block.data;
  push(section, ownText(data, section));

  if (block.type === "faq") {
    block.data.groups.forEach((group, gi) =>
      group.items.forEach((item, qi) => push(item.q, clean(item.a), `${base}#${faqItemId(block.id, gi, qi)}`)),
    );
    return entries;
  }
  const walk = (record: Fields) => {
    for (const child of titledItems(record)) {
      const title = itemTitle(child);
      if (title) push(title, ownText(child, title));
      walk(child);
    }
  };
  walk(data);
  return entries;
}

export function buildSearchIndex(content: SiteContent): SearchEntry[] {
  return content.pages.flatMap((page) => page.blocks.filter((block) => block.visible).flatMap((block) => blockEntries(block, page)));
}

export function tokenize(query: string) {
  return fold(query).split(/[^a-z0-9&'#+.-]+/).filter((term) => term.length > 0);
}

function scoreEntry(entry: SearchEntry, terms: string[], query: string): number | null {
  const title = fold(entry.title);
  const section = fold(entry.section);
  const text = fold(entry.text);
  let score = 0;
  for (const term of terms) {
    const inTitle = title.includes(term);
    const inSection = section.includes(term);
    const inText = text.includes(term);
    if (!inTitle && !inSection && !inText && !fold(entry.page).includes(term)) return null;
    const wordStart = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}`);
    if (inTitle) score += wordStart.test(title) ? SCORE_TITLE_WORD_START : SCORE_TITLE;
    if (inSection) score += SCORE_SECTION;
    if (inText) score += wordStart.test(text) ? SCORE_TEXT_WORD_START : SCORE_TEXT;
  }
  if (title === fold(query.trim())) score += SCORE_EXACT_TITLE;
  return score;
}

export function search(index: SearchEntry[], query: string, limit = DEFAULT_RESULT_LIMIT): SearchResult[] {
  const terms = tokenize(query);
  if (!terms.length) return [];
  const results: SearchResult[] = [];
  for (const entry of index) {
    const score = scoreEntry(entry, terms, query);
    if (score !== null) results.push({ ...entry, score });
  }
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

export function snippet(text: string, query: string, length = DEFAULT_SNIPPET_LENGTH): string {
  if (text.length <= length) return text;
  const folded = fold(text);
  const hit = tokenize(query)
    .map((term) => folded.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  if (hit === undefined) return `${text.slice(0, length).trimEnd()}…`;
  const start = Math.max(0, hit - SNIPPET_LEAD_IN);
  return `${start > 0 ? "…" : ""}${text.slice(start, start + length).trim()}${start + length < text.length ? "…" : ""}`;
}
