export type MediaItem = {
  id: string;
  url?: string;
  filename: string;
  mime: string;
  alt: string;
  size: number;
  width: number | null;
  height: number | null;
  created_at?: string;
};

type PreparedUpload = { blob: Blob; width: number | null; height: number | null; name: string };

type UploadReply = MediaItem & { url: string; error?: string };

const MAX_EDGE = 2200;
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const KILOBYTE = 1000;
const MEGABYTE = 1_000_000;
const REENCODE_ABOVE_BYTES = 900_000;
const WEBP_MIME = "image/webp";
const WEBP_QUALITY = 0.86;
const IMAGE_PROCESSING_FAILED = "Couldn’t process that image.";

async function encodeWebp(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(IMAGE_PROCESSING_FAILED);
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error(IMAGE_PROCESSING_FAILED))), WEBP_MIME, WEBP_QUALITY),
  );
}

async function prepare(file: File): Promise<PreparedUpload> {
  if (!RESIZABLE.has(file.type)) return { blob: file, width: null, height: null, name: file.name };
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  if (scale === 1 && file.size < REENCODE_ABOVE_BYTES) {
    bitmap.close();
    return { blob: file, width, height, name: file.name };
  }
  try {
    const blob = await encodeWebp(bitmap, width, height);
    return { blob, width, height, name: file.name.replace(/\.\w+$/, "") + ".webp" };
  } finally {
    bitmap.close();
  }
}

export async function uploadFile(file: File, alt = ""): Promise<MediaItem & { url: string }> {
  const { blob, width, height, name } = await prepare(file);
  const response = await fetch("/api/media", {
    method: "POST",
    headers: {
      "Content-Type": blob.type || file.type,
      "X-Filename": encodeURIComponent(name),
      "X-Alt": encodeURIComponent(alt),
      ...(width ? { "X-Width": String(width), "X-Height": String(height) } : {}),
    },
    body: blob,
  });
  const result = (await response.json().catch(() => ({}))) as UploadReply;
  if (!response.ok) throw new Error(result.error ?? "Upload failed.");
  return result;
}

export function altFromFilename(name: string) {
  return name
    .replace(/\.\w+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(img|dsc|final|copy)\b\s*\d*/gi, "")
    .trim();
}

export function formatBytes(bytes: number) {
  return bytes > MEGABYTE ? `${(bytes / MEGABYTE).toFixed(1)} MB` : `${Math.round(bytes / KILOBYTE)} KB`;
}
