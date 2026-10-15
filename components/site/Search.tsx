"use client";
import { ArrowRight, CornerDownLeft, Search as SearchIcon, X } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { buildSearchIndex, search, snippet, tokenize, type SearchResult } from "@/lib/content/search";
import type { SiteContent } from "@/lib/content/types";
import { revealHash } from "./reveal";

const noSubscribe = () => () => {};
/** "⌘K" on Apple devices, "Ctrl K" elsewhere; "⌘K" during server render. */
const useShortcutLabel = () =>
  useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => "⌘K",
  );

type Group = { page: string; items: { result: SearchResult; position: number }[] };

/** Results grouped under their page, numbered in on-screen order for arrow keys. */
function groupByPage(results: SearchResult[]): Group[] {
  const groups = new Map<string, SearchResult[]>();
  for (const result of results) groups.set(result.page, [...(groups.get(result.page) ?? []), result]);
  let position = 0;
  return [...groups].map(([page, items]) => ({ page, items: items.map((result) => ({ result, position: position++ })) }));
}

const SUGGESTIONS = ["Dress code", "Parking", "Shuttle", "Registration", "Virtual fair", "Hotels", "Headshots", "Payment"];

/** Wraps each query term found in `text` in <mark>. */
function highlight(text: string, query: string): ReactNode {
  const terms = tokenize(query).filter((term) => term.length > 1);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(pattern).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>));
}

export function SiteSearch({ content }: { content: SiteContent }) {
  const [open, setOpen] = useState(false);
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
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement).closest?.("input, textarea, select, [contenteditable]");
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    const url = new URL(result.href, location.href);
    if (url.pathname === location.pathname) {
      history.pushState(null, "", url.hash || url.pathname);
      if (url.hash) revealHash(url.hash);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    } else location.href = result.href;
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
              placeholder="Search dates, parking, dress code, FAQs…"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
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
              }}
            />
            <button type="button" className="search-close" onClick={close} aria-label="Close search">
              <X aria-hidden />
            </button>
          </div>

          <div className="search-body">
            {!query.trim() ? (
              <div className="search-suggest">
                <p>Popular searches</p>
                <ul>
                  {SUGGESTIONS.map((suggestion) => (
                    <li key={suggestion}>
                      <button type="button" onClick={() => updateQuery(suggestion)}>
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : results.length === 0 ? (
              <div className="search-empty" role="status">
                <p>
                  No results for “<strong>{query}</strong>”.
                </p>
                <p>
                  Try a shorter word, or email{" "}
                  <a href={`mailto:${content.settings.contactEmail}`}>{content.settings.contactEmail}</a>.
                </p>
              </div>
            ) : (
              <ul ref={list} id={listId} role="listbox" aria-label="Search results" className="search-results">
                {groups.map((group) => (
                  <li key={group.page} role="presentation">
                    <p className="search-group" aria-hidden>
                      {group.page}
                    </p>
                    <ul role="presentation">
                      {group.items.map(({ result, position }) => {
                        return (
                          <li key={`${result.href}|${result.title}`} role="presentation">
                            <a
                              id={`${listId}-${position}`}
                              role="option"
                              aria-selected={position === active}
                              data-index={position}
                              href={result.href}
                              className="search-result"
                              onMouseMove={() => position !== active && setActive(position)}
                              onClick={(event) => {
                                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                                event.preventDefault();
                                go(result);
                              }}
                            >
                              <span className="search-result-title">{highlight(result.title, query)}</span>
                              {result.section !== result.title && <span className="search-result-section">{result.section}</span>}
                              {result.text && <span className="search-result-text">{highlight(snippet(result.text, query), query)}</span>}
                              <ArrowRight aria-hidden className="search-result-arrow" />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
        </dialog>
      )}
    </>
  );
}
