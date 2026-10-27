const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h3", "h4"]);
const RENAME: Record<string, string> = { b: "strong", i: "em", div: "p" };
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|<!--[\s\S]*?-->/g;
const DANGEROUS_ELEMENTS = /<(script|style|template|iframe|object)\b[\s\S]*?<\/\1\s*>/gi;
const HREF_ATTRIBUTE = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;
const SAFE_SCHEMES = /^(https?:|mailto:|tel:)/i;
const EXTERNAL_URL = /^https?:/i;
const TRAILING_EMPTY_PARAGRAPHS = /(<p>\s*(<br>)?\s*<\/p>\s*)+$/g;

const escapeText = (text: string) => text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeAttr = (value: string) =>
  value.replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function safeHref(href: string): string {
  const value = href.trim();
  if (SAFE_SCHEMES.test(value)) return value;
  if (/^[/#]/.test(value) && !value.startsWith("//")) return value;
  return "";
}

function openAnchor(attributes: string) {
  const href = HREF_ATTRIBUTE.exec(attributes);
  const url = safeHref((href?.[2] ?? href?.[3] ?? href?.[4] ?? "").replace(/&amp;/g, "&"));
  if (!url) return "<a>";
  const external = EXTERNAL_URL.test(url) ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `<a href="${escapeAttr(url)}"${external}>`;
}

function allowedTag(whole: string, tagName: string, attributes: string) {
  const name = RENAME[tagName.toLowerCase()] ?? tagName.toLowerCase();
  if (!ALLOWED.has(name)) return "";
  if (whole.startsWith("</")) return name === "br" ? "" : `</${name}>`;
  return name === "a" ? openAnchor(attributes) : `<${name}>`;
}

export function sanitizeHtml(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "";
  const input = raw.replace(DANGEROUS_ELEMENTS, "");
  let out = "";
  let last = 0;
  for (const match of input.matchAll(TAG)) {
    const [whole, tagName, attributes] = match;
    out += escapeText(input.slice(last, match.index));
    last = match.index + whole.length;
    const isComment = !tagName;
    if (!isComment) out += allowedTag(whole, tagName, attributes);
  }
  out += escapeText(input.slice(last));
  return out.replace(TRAILING_EMPTY_PARAGRAPHS, "").trim();
}

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
