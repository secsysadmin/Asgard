"use client";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/lib/content/types";
import type { MediaItem } from "@/lib/studio/media";
import { errorMessage, fetchJson, JSON_HEADERS } from "./request";

const TOAST_DURATION_MS = 4200;
const HISTORY_LIMIT = 80;
const COALESCE_WINDOW_MS = 1200;
const AUTOSAVE_DELAY_MS = 900;
const EDITABLE_TARGETS = "[contenteditable], input, textarea, select";

type Tone = "error";
type Notify = (text: string, tone?: Tone) => void;
export type SaveState = "idle" | "saving" | "saved" | "error";
type ContentUpdate = SiteContent | ((current: SiteContent) => SiteContent);
type Commit = (next: ContentUpdate, coalesceKey?: string) => void;

type Toast = { text: string; tone?: Tone };
type Stack = { current: SiteContent[] };

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const notify = useCallback<Notify>((text, tone) => {
    setToast({ text, tone });
    window.setTimeout(() => setToast((current) => (current?.text === text ? null : current)), TOAST_DURATION_MS);
  }, []);
  return { toast, notify };
}

export function useEditHistory() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const contentRef = useRef<SiteContent | null>(null);
  const past = useRef<SiteContent[]>([]);
  const future = useRef<SiteContent[]>([]);
  const lastEdit = useRef({ key: "", at: 0 });

  const replace = useCallback((value: SiteContent) => {
    contentRef.current = value;
    setContent(value);
  }, []);

  const syncHistory = useCallback(
    () => setHistory({ canUndo: past.current.length > 0, canRedo: future.current.length > 0 }),
    [],
  );

  const commit = useCallback<Commit>(
    (next, coalesceKey = "") => {
      const current = contentRef.current;
      if (!current) return;
      const value = typeof next === "function" ? next(current) : next;
      if (value === current) return;
      const now = Date.now();
      const coalesce = coalesceKey && lastEdit.current.key === coalesceKey && now - lastEdit.current.at < COALESCE_WINDOW_MS;
      if (!coalesce) {
        past.current = [...past.current.slice(-HISTORY_LIMIT), current];
        future.current = [];
      }
      lastEdit.current = { key: coalesceKey, at: now };
      replace(value);
      syncHistory();
    },
    [replace, syncHistory],
  );

  const step = useCallback(
    (from: Stack, to: Stack) => {
      const target = from.current.pop();
      if (!target || !contentRef.current) return;
      to.current.push(contentRef.current);
      lastEdit.current = { key: "", at: 0 };
      replace(target);
      syncHistory();
    },
    [replace, syncHistory],
  );
  const undo = useCallback(() => step(past, future), [step]);
  const redo = useCallback(() => step(future, past), [step]);

  return { content, contentRef, history, load: replace, commit, undo, redo };
}

export function useDraftAutosave(content: SiteContent | null, contentRef: RefObject<SiteContent | null>, notify: Notify) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savedJson = useRef("");

  const markSaved = useCallback((value: SiteContent) => {
    savedJson.current = JSON.stringify(value);
    setSaveState("saved");
  }, []);

  useEffect(() => {
    if (!content) return;
    const json = JSON.stringify(content);
    if (json === savedJson.current) return;
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        await fetchJson("/api/content", { method: "PUT", headers: JSON_HEADERS, body: json });
        savedJson.current = json;
        setSaveState("saved");
      } catch (error) {
        setSaveState("error");
        notify(errorMessage(error, "Couldn’t save the draft."), "error");
      }
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [content, notify]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (contentRef.current && JSON.stringify(contentRef.current) !== savedJson.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [contentRef]);

  return { saveState, markSaved };
}

export function useUndoShortcuts(undo: () => void, redo: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if ((event.target as HTMLElement).closest(EDITABLE_TARGETS)) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
}

export function useMediaLibrary() {
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [libraryError, setLibraryError] = useState("");
  const loadLibrary = useCallback(() => {
    fetchJson<MediaItem[]>("/api/media")
      .then((items) => {
        setLibrary(items);
        setLibraryError("");
      })
      .catch((error) => setLibraryError(errorMessage(error, "Media library unavailable.")));
  }, []);
  useEffect(loadLibrary, [loadLibrary]);
  return { library, libraryError, loadLibrary };
}

export function useElementWidth(ref: RefObject<HTMLElement | null>, initialWidth: number, mounted: boolean) {
  const [width, setWidth] = useState(initialWidth);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, mounted]);
  return width;
}
