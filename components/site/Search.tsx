"use client";
import { ArrowRight, CornerDownLeft, Search as SearchIcon, X } from "lucide-react";
import { Fragment, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { buildSearchIndex, search, snippet, tokenize, type SearchResult } from "@/lib/content/search";
import type { SiteContent } from "@/lib/content/types";
import { revealHash } from "./reveal";

type Props = { content: SiteContent };
type GroupItem = { result: SearchResult; position: number };
type Group = { page: string; items: GroupItem[] };
type SuggestionsProps = { onPick: (suggestion: string) => void };
type NoResultsProps = { query: string; contactEmail: string };
type ResultListProps = {
  ref?: Ref<HTMLUListElement>;
  id: string;
  groups: Group[];
  query: string;
  active: number;
  onHover: (position: number) => void;
  onOpen: (result: SearchResult) => void;
};

const SUGGESTIONS = ["Dress code", "Parking", "Shuttle", "Registration", "Virtual fair", "Hotels", "Headshots", "Payment"];
const SEARCH_PLACEHOLDER = "Search dates, parking, dress code, FAQs…";
const APPLE_DEVICE = /Mac|iPhone|iPad/;
const APPLE_SHORTCUT_LABEL = "⌘K";
const OTHER_SHORTCUT_LABEL = "Ctrl K";
const MIN_HIGHLIGHT_TERM_LENGTH = 2;
const TYPING_TARGETS = "input, textarea, select, [contenteditable]";
const REGEXP_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

const noSubscribe = () => () => {};
const useShortcutLabel = () =>
  useSyncExternalStore(
    noSubscribe,
    () => (APPLE_DEVICE.test(navigator.userAgent) ? APPLE_SHORTCUT_LABEL : OTHER_SHORTCUT_LABEL),
    () => APPLE_SHORTCUT_LABEL,
  );

function groupByPage(results: SearchResult[]): Group[] {
  const groups = new Map<string, SearchResult[]>();
  for (const result of results) groups.set(result.page, [...(groups.get(result.page) ?? []), result]);
  let position = 0;
  return [...groups].map(([page, items]) => ({ page, items: items.map((result) => ({ result, position: position++ })) }));
}

function highlight(text: string, query: string): ReactNode {
  const terms = tokenize(query).filter((term) => term.length >= MIN_HIGHLIGHT_TERM_LENGTH);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map((term) => term.replace(REGEXP_SPECIAL_CHARS, "\\$&")).join("|")})`, "gi");
  return text.split(pattern).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>));
}

function isSearchShortcut(event: KeyboardEvent) {
  const typing = event.target instanceof Element && event.target.closest(TYPING_TARGETS);
  return ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !typing);
}

function openResult(href: string) {
  const url = new URL(href, location.href);
  if (url.pathname !== location.pathname) {
    location.href = href;
    return;
  }
  history.pushState(null, "", url.hash || url.pathname);
  if (url.hash) revealHash(url.hash);
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

function useSearchShortcut() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

function Suggestions({ onPick }: SuggestionsProps) {
  return (
    <div className="search-suggest">
      <p>Popular searches</p>
      <ul>
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <button type="button" onClick={() => onPick(suggestion)}>
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoResults({ query, contactEmail }: NoResultsProps) {
  return (
    <div className="search-empty" role="status">
      <p>
        No results for “<strong>{query}</strong>”.
      </p>
      <p>
        Try a shorter word, or email{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
    </div>
  );
}

function ResultList({ ref, id, groups, query, active, onHover, onOpen }: ResultListProps) {
  return (
    <ul ref={ref} id={id} role="listbox" aria-label="Search results" className="search-results">
      {groups.map((group) => (
        <li key={group.page} role="presentation">
          <p className="search-group" aria-hidden>
            {group.page}
          </p>
          <ul role="presentation">
            {group.items.map(({ result, position }) => (
              <li key={`${result.href}|${result.title}`} role="presentation">
                <a
                  id={`${id}-${position}`}
                  role="option"
                  aria-selected={position === active}
                  data-index={position}
                  href={result.href}
                  className="search-result"
                  onMouseMove={() => position !== active && onHover(position)}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                    event.preventDefault();
                    onOpen(result);
                  }}
                >
                  <span className="search-result-title">{highlight(result.title, query)}</span>
                  {result.section !== result.title && <span className="search-result-section">{result.section}</span>}
                  {result.text && <span className="search-result-text">{highlight(snippet(result.text, query), query)}</span>}
                  <ArrowRight aria-hidden className="search-result-arrow" />
                </a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function KeyHints() {
  return (
    <footer className="search-foot" aria-hidden>
      <span>
        <kbd>↑</kbd>
        <kbd>↓</kbd> to move
      </span>
      <span>
        <kbd>
          <CornerDownLeft />
        </kbd>{" "}
        to open
      </span>
      <span>
        <kbd>esc</kbd> to close
      </span>
    </footer>
  );
}

export function SiteSearch({ content }: Props) {
  const { open, setOpen } = useSearchShortcut();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const shortcut = useShortcutLabel();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const index = useMemo(() => buildSearchIndex(content), [content]);
  const results = useMemo(() => search(index, query), [index, query]);
  const groups = useMemo(() => groupByPage(results), [results]);
  const ordered = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const updateQuery = (value: string) => {
    setQuery(value);
    setActive(0);
  };

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    input.current?.select();
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => {
    dialog.current?.close();
    setOpen(false);
  };

  const go = (result: SearchResult) => {
    close();
    openResult(result.href);
  };

  const onInputKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, ordered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" && ordered[active]) {
      event.preventDefault();
      go(ordered[active].result);
    }
  };

  return (
    <>
      <button type="button" className="search-toggle" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Search the site">
        <SearchIcon aria-hidden />
        <span className="search-toggle-label">Search</span>
        <kbd aria-hidden>{shortcut}</kbd>
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="search-dialog"
          aria-label="Search the site"
          onClose={() => setOpen(false)}
          onClick={(event) => event.target === dialog.current && close()}
        >
          <div className="search-box">
            <SearchIcon aria-hidden />
            <input
              ref={input}
              type="search"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-activedescendant={ordered[active] ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
              placeholder={SEARCH_PLACEHOLDER}
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={onInputKey}
            />
            <button type="button" className="search-close" onClick={close} aria-label="Close search">
              <X aria-hidden />
            </button>
          </div>

          <div className="search-body">
            {!query.trim() ? (
              <Suggestions onPick={updateQuery} />
            ) : results.length === 0 ? (
              <NoResults query={query} contactEmail={content.settings.contactEmail} />
            ) : (
              <ResultList ref={list} id={listId} groups={groups} query={query} active={active} onHover={setActive} onOpen={go} />
            )}
          </div>
          <KeyHints />
        </dialog>
      )}
    </>
  );
}
