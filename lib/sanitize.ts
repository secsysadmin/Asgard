// Allowlist sanitizer for rich-text fields. Runs on save (server) and on
// render, so stored HTML can only ever contain these tags and safe links.
const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h3", "h4"]);
const RENAME: Record<string, string> = { b: "strong", i: "em", div: "p" };
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|<!--[\s\S]*?-->/g;

const escapeText = (text: string) => text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function safeHref(href: string): string {
  const value = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[/#]/.test(value) && !value.startsWith("//")) return value;
  return "";
}

const escapeAttr = (value: string) =>
  value.replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function sanitizeHtml(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "";
  const input = raw.replace(/<(script|style|template|iframe|object)\b[\s\S]*?<\/\1\s*>/gi, "");
  let out = "";
  let last = 0;
  for (const match of input.matchAll(TAG)) {
    out += escapeText(input.slice(last, match.index));
    last = (match.index ?? 0) + match[0].length;
    if (!match[1]) continue; // comment
    const tag = match[1].toLowerCase();
    const name = RENAME[tag] ?? tag;
    if (!ALLOWED.has(name)) continue;
    const closing = match[0].startsWith("</");
    if (closing) {
      if (name !== "br") out += `</${name}>`;
      continue;
    }
    if (name === "a") {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(match[2]);
      const url = safeHref((href?.[2] ?? href?.[3] ?? href?.[4] ?? "").replace(/&amp;/g, "&"));
      const external = /^https?:/i.test(url);
      out += url
        ? `<a href="${escapeAttr(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>`
        : "<a>";
      continue;
    }
    out += `<${name}>`;
  }
  out += escapeText(input.slice(last));
  return out.replace(/(<p>\s*(<br>)?\s*<\/p>\s*)+$/g, "").trim();
}

/** Plain-text view of rich HTML, used for search, previews, and labels. */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
