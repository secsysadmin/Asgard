export const MEDIA_ID = /^[A-Za-z0-9_-]{12}$/;
export const MAX_ALT_LENGTH = 300;

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const SVG_SNIFF_BYTES = 4096;
const SVG_MIME = "image/svg+xml";
const UNSAFE_FILENAME_CHARACTERS = /[^\w.\- ]+/g;
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, s-maxage=31536000, immutable";
const SVG_SANDBOX_POLICY = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox";

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
const UNSAFE_SVG = /<\s*(script|foreignobject|iframe|embed|object|handler)\b|\bon[a-z]+\s*=|(java|vb)script\s*:|&#|<!entity|\bhref\s*=\s*(?!["']?\s*#)/i;

export function cleanFilename(name: string) {
  return name.replace(UNSAFE_FILENAME_CHARACTERS, "");
}

export function validateUpload(mime: string, bytes: Buffer): string | null {
  if (!ALLOWED_TYPES.has(mime)) return "Upload a JPG, PNG, WebP, GIF, AVIF, SVG, or PDF.";
  if (!bytes.length) return "The file is empty.";
  if (bytes.length > MAX_UPLOAD_BYTES) return "Files must be under 4 MB.";
  if (!SIGNATURES[mime](bytes)) return "That file’s contents don’t match its type.";
  if (mime === SVG_MIME && UNSAFE_SVG.test(bytes.toString("utf8")))
    return "That SVG contains scripts or links and can’t be used. Export it as PNG instead.";
  return null;
}

export function mediaHeaders(mime: string, filename: string): Record<string, string> {
  return {
    "Content-Type": mime,
    // Every upload gets a new id, so a URL's bytes never change and can be cached forever.
    "Cache-Control": IMMUTABLE_CACHE_CONTROL,
    "Content-Disposition": `inline; filename="${cleanFilename(filename)}"`,
    "X-Content-Type-Options": "nosniff",
    ...(mime === SVG_MIME ? { "Content-Security-Policy": SVG_SANDBOX_POLICY } : {}),
  };
}
