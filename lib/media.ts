// Upload validation for the media library.

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MEDIA_ID = /^[A-Za-z0-9_-]{12}$/;

const startsWith = (bytes: Buffer, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/** True when the file's leading bytes match the type it claims to be. */
const SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  "image/jpeg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  "image/png": (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (b) => startsWith(b, ascii("GIF8")),
  "image/webp": (b) => startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8),
  "image/avif": (b) => startsWith(b, ascii("ftyp"), 4) && /^avi[fs]$/.test(b.subarray(8, 12).toString("latin1")),
  "application/pdf": (b) => startsWith(b, ascii("%PDF-")),
  "image/svg+xml": (b) => /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/i.test(b.subarray(0, 4096).toString("utf8")),
};

export const ALLOWED_TYPES = new Set(Object.keys(SIGNATURES));

// SVG is markup, so anything that can execute or load other documents is refused.
// Only same-document references (href="#id") are allowed.
const UNSAFE_SVG = /<\s*(script|foreignobject|iframe|embed|object|handler)\b|\bon[a-z]+\s*=|(java|vb)script\s*:|&#|<!entity|\bhref\s*=\s*(?!["']?\s*#)/i;

export function validateUpload(mime: string, bytes: Buffer): string | null {
  if (!ALLOWED_TYPES.has(mime)) return "Upload a JPG, PNG, WebP, GIF, AVIF, SVG, or PDF.";
  if (!bytes.length) return "The file is empty.";
  if (bytes.length > MAX_UPLOAD_BYTES) return "Files must be under 4 MB.";
  if (!SIGNATURES[mime](bytes)) return "That file’s contents don’t match its type.";
  if (mime === "image/svg+xml" && UNSAFE_SVG.test(bytes.toString("utf8")))
    return "That SVG contains scripts or links and can’t be used. Export it as PNG instead.";
  return null;
}

/** Response headers for serving a stored file. */
export function mediaHeaders(mime: string, filename: string): Record<string, string> {
  return {
    "Content-Type": mime,
    // Every upload gets a new id, so a URL's bytes never change: cache it on
    // Vercel's CDN (s-maxage) and in browsers for a year. Neon is only read
    // on a CDN miss.
    "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    "Content-Disposition": `inline; filename="${filename.replace(/[^\w.\- ]+/g, "")}"`,
    "X-Content-Type-Options": "nosniff",
    // Opened directly, an SVG is a document: sandbox it so nothing can run.
    ...(mime === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox" } : {}),
  };
}
