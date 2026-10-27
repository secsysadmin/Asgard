"use client";
import { ClipboardCopy, ImagePlus, Loader2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { uploadFile } from "@/lib/studio/media";
import {
  buildPlan,
  type ImportMode,
  type Member,
  type PlanEntry,
  parseRoster,
  portraitAlt,
  rosterToRows,
} from "@/lib/studio/team-import";
import { Dropzone, Modal } from "./dialogs";
import { errorMessage } from "./request";

type TeamImportProps = {
  members: Member[];
  onClose: () => void;
  onApply: (members: Member[], summary: string) => void;
  onLibraryChange: () => void;
};
type Upload = { entry: PlanEntry; file: File };

const STATUS_LABEL = { new: "New", updated: "Updated", unchanged: "No change", removed: "Removed" } as const;
const SUMMARY_STATUSES = ["new", "updated", "removed"] as const;
const COPIED_NOTICE_MS = 2000;

function withPortraitAlt(member: Member, photo: Member["photo"]): Member {
  return { ...member, photo: photo.src && !photo.alt ? { ...photo, alt: portraitAlt(member.name) } : photo };
}

export function TeamImport({ members, onClose, onApply, onLibraryChange }: TeamImportProps) {
  const [roster, setRoster] = useState("");
  const [mode, setMode] = useState<ImportMode>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => parseRoster(roster), [roster]);
  const fileNames = useMemo(() => files.map((file) => file.name), [files]);
  const plan = useMemo(() => buildPlan(members, rows, fileNames, mode, overrides), [members, rows, fileNames, mode, overrides]);
  const previews = useMemo(() => new Map(files.map((file) => [file.name, URL.createObjectURL(file)])), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const usedFiles = new Set(plan.map((entry) => entry.file).filter(Boolean));
  const unmatched = fileNames.filter((name) => !usedFiles.has(name));
  const counts = plan.reduce<Record<string, number>>((tally, entry) => ({ ...tally, [entry.status]: (tally[entry.status] ?? 0) + 1 }), {});
  const summary = SUMMARY_STATUSES.filter((status) => counts[status])
    .map((status) => `${counts[status]} ${STATUS_LABEL[status].toLowerCase()}`)
    .join(" · ");
  const busy = progress !== null;

  const addFiles = (list: FileList) => {
    const images = [...list].filter((file) => file.type.startsWith("image/"));
    setFiles((current) => [...current.filter((file) => !images.some((added) => added.name === file.name)), ...images]);
  };

  const copyRoster = async () => {
    try {
      await navigator.clipboard.writeText(rosterToRows(members));
    } catch {
      setError("Couldn’t copy the team. Check that this page is allowed to use the clipboard.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_NOTICE_MS);
  };

  const apply = async () => {
    const kept = plan.filter((entry) => entry.status !== "removed");
    const filesByName = new Map(files.map((file) => [file.name, file]));
    const uploads = kept.flatMap<Upload>((entry) => {
      const file = filesByName.get(entry.file);
      return file ? [{ entry, file }] : [];
    });
    setError("");
    setProgress({ done: 0, total: uploads.length });
    const photos = new Map<string, Member["photo"]>();
    try {
      for (const { entry, file } of uploads) {
        const alt = portraitAlt(entry.member.name);
        const result = await uploadFile(file, alt);
        photos.set(entry.key, { src: result.url, alt });
        setProgress((current) => current && { ...current, done: current.done + 1 });
      }
    } catch (reason) {
      setError(errorMessage(reason, "A photo failed to upload. Nothing was changed."));
      setProgress(null);
      return;
    }
    if (uploads.length) onLibraryChange();
    onApply(
      kept.map((entry) => withPortraitAlt(entry.member, photos.get(entry.key) ?? entry.member.photo)),
      summary || "No changes",
    );
  };

  const renderEntry = (entry: PlanEntry) => {
    const src = entry.file ? previews.get(entry.file) : entry.member.photo.src;
    return (
      <li key={entry.key} className={`is-${entry.status}`}>
        <span className="st-import-photo">{src ? <img src={src} alt="" /> : <ImagePlus />}</span>
        <span className="st-import-text">
          <strong>{entry.member.name}</strong>
          <small>{[entry.member.role, entry.member.major].filter(Boolean).join(" · ") || "No role or major"}</small>
        </span>
        {files.length > 0 && entry.status !== "removed" && (
          <select
            aria-label={`Photo for ${entry.member.name}`}
            value={entry.file}
            onChange={(event) => setOverrides({ ...overrides, [entry.key]: event.target.value })}
          >
            <option value="">{entry.member.photo.src ? "Keep current photo" : "No photo"}</option>
            {fileNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
        <span className={`st-import-status st-import-${entry.status}`}>{STATUS_LABEL[entry.status]}</span>
      </li>
    );
  };
  const changed = plan.filter((entry) => entry.status !== "unchanged");
  const unchanged = plan.filter((entry) => entry.status === "unchanged");

  return (
    <Modal
      title="Bulk update team"
      onClose={busy ? () => undefined : onClose}
      wide
      footer={
        <>
          <span className="st-muted">
            {progress ? `Uploading photo ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : summary || "Nothing to change yet"}
          </span>
          <span className="st-spacer" />
          <button type="button" className="st-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="st-btn st-btn-primary" onClick={apply} disabled={busy || !summary}>
            {busy ? <Loader2 className="st-spin" /> : <Upload />} Apply to team
          </button>
        </>
      }
    >
      <div className="st-import">
        <section className="st-import-step">
          <header>
            <h3>1. Team list</h3>
            <button type="button" className="st-btn st-btn-quiet st-btn-small" onClick={copyRoster}>
              <ClipboardCopy /> {copied ? "Copied" : "Copy current team"}
            </button>
          </header>
          <label className="st-field">
            <span>Paste rows from Google Sheets or Excel</span>
            <textarea
              rows={7}
              value={roster}
              onChange={(event) => setRoster(event.target.value)}
              placeholder={"Name\tRole\tMajor\nNathan Lam ’27\tCareer Fair Co-Chair\tComputer Engineering"}
              spellCheck={false}
            />
            <small>
              Columns: Name, Role, Major, and optionally Photo (a file name). A header row is optional. Blank cells keep what’s
              already there. Leave this empty to only add photos.
            </small>
          </label>
          {rows.length > 0 && (
            <fieldset className="st-import-mode">
              <legend>People not in your list</legend>
              <label>
                <input type="radio" name="mode" checked={mode === "merge"} onChange={() => setMode("merge")} />
                <span>Keep them</span>
              </label>
              <label>
                <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} />
                <span>Remove them (replace the whole team)</span>
              </label>
            </fieldset>
          )}
        </section>

        <section className="st-import-step">
          <header>
            <h3>2. Headshots</h3>
            {files.length > 0 && (
              <button type="button" className="st-btn st-btn-quiet st-btn-small" onClick={() => { setFiles([]); setOverrides({}); }}>
                Clear photos
              </button>
            )}
          </header>
          <Dropzone small multiple accept="image/*" onFiles={addFiles}>
            <ImagePlus />
            <strong>{files.length ? `${files.length} photo${files.length === 1 ? "" : "s"} added` : "Drop all the headshots here, or click to choose"}</strong>
            <span>Photos match people by file name, like nathan-lam.jpg or “Nathan Lam.png”.</span>
          </Dropzone>
          {unmatched.length > 0 && (
            <p className="st-import-warn">
              Not matched to anyone yet: {unmatched.join(", ")}. Pick a photo for the right person below.
            </p>
          )}
        </section>

        <section className="st-import-step">
          <header>
            <h3>3. Preview</h3>
          </header>
          {changed.length > 0 && <ol className="st-import-list">{changed.map(renderEntry)}</ol>}
          {unchanged.length > 0 && (
            <details className="st-import-same" open={!changed.length}>
              <summary>No change ({unchanged.length})</summary>
              <ol className="st-import-list">{unchanged.map(renderEntry)}</ol>
            </details>
          )}
          {changed.some((entry) => entry.status === "new") && mode === "merge" && (
            <p className="st-muted">Everyone keeps their current order. New people are added at the end.</p>
          )}
          {error && <p className="st-error">{error}</p>}
        </section>
      </div>
    </Modal>
  );
}
