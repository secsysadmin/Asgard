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
const SAVE_FAILED_MESSAGE = "Couldn’t save the draft.";

type Tone = "error";
type Notify = (text: string, tone?: Tone) => void;
// pending: edits are waiting for the autosave timer. saving: a request is out. saved: the server has
// exactly what's on screen. failed: the last request failed and nothing newer has been sent yet.
export type SaveState = "pending" | "saving" | "saved" | "failed";
type SavePhase = Exclude<SaveState, "pending">;
type ContentUpdate = SiteContent | ((current: SiteContent) => SiteContent);
type Commit = (next: ContentUpdate, coalesceKey?: string) => void;

type Toast = { id: number; text: string; tone?: Tone };
type AutosaveOptions = {
  content: SiteContent | null;
  contentRef: RefObject<SiteContent | null>;
  notify: Notify;
  withdraw: (text: string) => void;
};
type Stack = { current: SiteContent[] };

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);
  const notify = useCallback<Notify>((text, tone) => {
    const id = ++nextId.current;
    setToast({ id, text, tone });
    if (tone === "error") return;
    // Match on id, not text, so an older timer can't close a newer toast that repeats the same message.
    window.setTimeout(() => setToast((current) => (current?.id === id ? null : current)), TOAST_DURATION_MS);
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  const withdraw = useCallback((text: string) => setToast((current) => (current?.text === text ? null : current)), []);
  return { toast, notify, dismiss, withdraw };
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

export function useDraftAutosave({ content, contentRef, notify, withdraw }: AutosaveOptions) {
  const [phase, setPhase] = useState<SavePhase>("saved");
  const savedJson = useRef("");
  const inFlight = useRef(false);
  const failure = useRef("");

  const markSaved = useCallback((value: SiteContent) => {
    savedJson.current = JSON.stringify(value);
    setPhase("saved");
  }, []);

  const saveLatest = useCallback(async function saveLatest() {
    if (inFlight.current || !contentRef.current) return;
    const json = JSON.stringify(contentRef.current);
    if (json === savedJson.current) {
      setPhase("saved");
      return;
    }
    inFlight.current = true;
    setPhase("saving");
    try {
      await fetchJson("/api/content", { method: "PUT", headers: JSON_HEADERS, body: json });
      savedJson.current = json;
      withdraw(failure.current);
    } catch (error) {
      setPhase("failed");
      failure.current = errorMessage(error, SAVE_FAILED_MESSAGE);
      notify(failure.current, "error");
      return;
    } finally {
      inFlight.current = false;
    }
    if (contentRef.current && JSON.stringify(contentRef.current) !== json) {
      void saveLatest();
    } else {
      setPhase("saved");
    }
  }, [contentRef, notify, withdraw]);

  useEffect(() => {
    if (!content) return;
    const json = JSON.stringify(content);
    if (json === savedJson.current && !inFlight.current) {
      setPhase("saved");
      return;
    }
    const timer = window.setTimeout(() => void saveLatest(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [content, saveLatest]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (inFlight.current || (contentRef.current && JSON.stringify(contentRef.current) !== savedJson.current)) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [contentRef]);

  // The phase only changes when a request starts or ends, so unsent edits are worked out here instead.
  const unsent = !content || JSON.stringify(content) !== savedJson.current;
  const saveState: SaveState = phase === "saved" && unsent ? "pending" : phase;
  return { saveState, markSaved, retrySave: saveLatest };
}

export function useUndoShortcuts(undo: () => void, redo: () => void, enabled: boolean) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!enabled) return;
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
  }, [undo, redo, enabled]);
}

export function useMediaLibrary() {
  const [library, setLibrary] = useState<MediaItem[] | null>(null);
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
