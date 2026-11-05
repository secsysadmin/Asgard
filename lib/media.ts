export const MEDIA_ID = /^[A-Za-z0-9_-]{12}$/;
export const MAX_ALT_LENGTH = 300;

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const SVG_SNIFF_BYTES = 4096;
const SVG_MIME = "image/svg+xml";
const UNSAFE_FILENAME_CHARACTERS = /[^\w.\- ]+/g;
// Media can be deleted, so shared caches must not keep it for long after that.
const MEDIA_CACHE_CONTROL = "public, max-age=3600, s-maxage=3600";
const FRAME_POLICY = "frame-ancestors 'none'";
const SVG_SANDBOX_POLICY = `default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox; ${FRAME_POLICY}`;
const OTHER_MEDIA_POLICY = `${FRAME_POLICY}; base-uri 'none'; form-action 'none'`;

const startsWith = (bytes: Buffer, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  "image/jpeg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  "image/png": (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (b) => startsWith(b, ascii("GIF8")),
  "image/webp": (b) => startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8),
  "image/avif": (b) => startsWith(b, ascii("ftyp"), 4) && /^avi[fs]$/.test(b.subarray(8, 12).toString("latin1")),
  "application/pdf": (b) => startsWith(b, ascii("%PDF-")),
  [SVG_MIME]: (b) => /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/i.test(b.subarray(0, SVG_SNIFF_BYTES).toString("utf8")),
};

const ALLOWED_TYPES = new Set(Object.keys(SIGNATURES));

// SVG is markup: refuse anything that can execute or load other documents; only href="#id" is allowed.
const UNSAFE_SVG = /<\s*(script|foreignobject|iframe|embed|object|handler)\b|\bon[a-z]+\s*=|&#|<!entity|\bhref\s*=\s*(?!["']?\s*#)|<\s*(set|animate)\b[^>]*attributename\s*=\s*["']?\s*(xlink:)?href/i;
// URL parsers drop whitespace and control characters, so "java\tscript:" must be caught with them removed.
const SCRIPT_URL = /(java|vb)script:/i;
const IGNORED_URL_CHARACTERS = /[\s\x00-\x1f]+/g;
// Browsers honour the declared encoding, and some (ISO-2022-JP, UTF-7) can hide markup from a UTF-8 scan.
const XML_ENCODING = /^\s*<\?xml[^>]*\bencoding\s*=\s*["']([^"']*)["']/i;
const UTF8_ENCODING = /^utf-?8$/i;
const DISALLOWED_CONTROL_BYTES = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;

function unsafeSvg(bytes: Buffer) {
  const text = bytes.toString("utf8");
  const encoding = XML_ENCODING.exec(text)?.[1];
  if (encoding !== undefined && !UTF8_ENCODING.test(encoding)) return true;
  if (DISALLOWED_CONTROL_BYTES.test(text)) return true;
  return UNSAFE_SVG.test(text) || SCRIPT_URL.test(text.replace(IGNORED_URL_CHARACTERS, ""));
}

export function cleanFilename(name: string) {
  return name.replace(UNSAFE_FILENAME_CHARACTERS, "");
}

export function validateUpload(mime: string, bytes: Buffer): string | null {
  if (!ALLOWED_TYPES.has(mime)) return "Upload a JPG, PNG, WebP, GIF, AVIF, SVG, or PDF.";
  if (!bytes.length) return "The file is empty.";
  if (bytes.length > MAX_UPLOAD_BYTES) return "Files must be under 4 MB.";
  if (!SIGNATURES[mime](bytes)) return "That file’s contents don’t match its type.";
  if (mime === SVG_MIME && unsafeSvg(bytes))
    return "That SVG contains scripts or links and can’t be used. Export it as PNG instead.";
  return null;
}

export function mediaHeaders(mime: string, filename: string): Record<string, string> {
  return {
    "Content-Type": mime,
    "Cache-Control": MEDIA_CACHE_CONTROL,
    "Content-Disposition": `inline; filename="${cleanFilename(filename)}"`,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    // The site-wide headers in next.config.ts skip this route, because Next keeps the config's
    // Content-Security-Policy over a route's own and would silently drop the SVG sandbox.
    "Content-Security-Policy": mime === SVG_MIME ? SVG_SANDBOX_POLICY : OTHER_MEDIA_POLICY,
  };
}
