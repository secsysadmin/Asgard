import type { BlockData } from "../content/types";

export type Member = BlockData["team"]["members"][number];
export type RosterRow = { name: string; role: string; major: string; photo: string };
export type ImportMode = "merge" | "replace";
export type EntryStatus = "new" | "updated" | "unchanged" | "removed";
export type PlanEntry = { key: string; member: Member; file: string; status: EntryStatus };

const COLUMNS: [keyof RosterRow, RegExp][] = [
  ["name", /name|member|person/],
  ["role", /role|position|title|officer/],
  ["major", /major|degree|discipline|department/],
  ["photo", /photo|image|picture|headshot|file/],
];

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t").map((cell) => cell.trim());
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

export function parseRoster(text: string): RosterRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const table = lines.map((line) => splitLine(line, delimiter));
  const first = table[0].map((cell) => cell.toLowerCase());
  const hasHeader = first.some((cell) => /^(full\s+)?name$|^names?\b/.test(cell)) && first.length > 1;
  const index: Record<keyof RosterRow, number> = { name: 0, role: 1, major: 2, photo: 3 };
  if (hasHeader) {
    const used = new Set<number>();
    for (const [key, pattern] of COLUMNS) {
      const at = first.findIndex((cell, i) => !used.has(i) && pattern.test(cell));
      index[key] = at;
      if (at >= 0) used.add(at);
    }
  }
  return (hasHeader ? table.slice(1) : table)
    .map((cells) => ({
      name: cells[index.name] ?? "",
      role: index.role >= 0 ? (cells[index.role] ?? "") : "",
      major: index.major >= 0 ? (cells[index.major] ?? "") : "",
      photo: index.photo >= 0 ? (cells[index.photo] ?? "") : "",
    }))
    .filter((row) => row.name);
}

export function displayName(name: string) {
  return name.replace(/\s*[’'‘`]\s?\d{2}\s*$/, "").trim();
}

export function nameKey(value: string) {
  return displayName(value.replace(/\.\w{2,5}$/, ""))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .join("-");
}

export function matchFile(name: string, files: string[], explicit = ""): string {
  if (explicit) {
    const wanted = explicit.toLowerCase();
    const exact = files.find((file) => file.toLowerCase() === wanted || nameKey(file) === nameKey(explicit));
    if (exact) return exact;
  }
  const key = nameKey(name);
  if (!key) return "";
  const exact = files.find((file) => nameKey(file) === key);
  if (exact) return exact;
  const tokens = key.split("-");
  if (tokens.length < 2) return "";
  const loose = files.filter((file) => {
    const fileTokens = new Set(nameKey(file).split("-"));
    return tokens.every((token) => fileTokens.has(token));
  });
  return loose.length === 1 ? loose[0] : "";
}

const blankMember = (): Member => ({ name: "", role: "", major: "", photo: { src: "", alt: "" } });

export function buildPlan(
  existing: Member[],
  rows: RosterRow[],
  files: string[],
  mode: ImportMode,
  overrides: Record<string, string> = {},
): PlanEntry[] {
  const fileFor = (key: string, name: string, explicit = "") => (key in overrides ? overrides[key] : matchFile(name, files, explicit));
  const keyed = existing.map((member, i) => ({ member, key: nameKey(member.name) || `existing-${i}` }));

  if (!rows.length)
    return keyed.map(({ member, key }) => {
      const file = fileFor(key, member.name);
      return { key, member, file, status: file ? "updated" : "unchanged" };
    });

  const fromRows: PlanEntry[] = [];
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    const key = nameKey(row.name) || `row-${i}`;
    if (seen.has(key)) return;
    seen.add(key);
    const current = keyed.find((entry) => entry.key === key)?.member;
    const member: Member = {
      ...(current ?? blankMember()),
      name: row.name,
      role: row.role || current?.role || "",
      major: row.major || current?.major || "",
      photo: current?.photo ?? { src: "", alt: "" },
    };
    const file = fileFor(key, row.name, row.photo);
    const changed = !current || file || member.name !== current.name || member.role !== current.role || member.major !== current.major;
    fromRows.push({ key, member, file, status: !current ? "new" : changed ? "updated" : "unchanged" });
  });

  const rest = keyed.filter((entry) => !seen.has(entry.key));
  if (mode === "replace")
    return [...fromRows, ...rest.map(({ member, key }): PlanEntry => ({ key, member, file: "", status: "removed" }))];

  const byKey = new Map(fromRows.map((entry) => [entry.key, entry]));
  const merged: PlanEntry[] = keyed.map(({ member, key }) => {
    const updated = byKey.get(key);
    if (updated) return updated;
    const file = fileFor(key, member.name);
    return { key, member, file, status: file ? "updated" : "unchanged" };
  });
  return [...merged, ...fromRows.filter((entry) => entry.status === "new")];
}

export function rosterToRows(members: Member[]) {
  const clean = (value: string) => value.replace(/[\t\r\n]+/g, " ").trim();
  return ["Name\tRole\tMajor", ...members.map((member) => [member.name, member.role, member.major].map(clean).join("\t"))].join("\n");
}

export function portraitAlt(name: string) {
  return `Portrait of ${displayName(name)}`;
}
