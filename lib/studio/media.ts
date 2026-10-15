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

const MAX_EDGE = 2200;
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/** Downscale large photos in the browser and re-encode them as WebP. */
async function prepare(file: File): Promise<{ blob: Blob; width: number | null; height: number | null; name: string }> {
  if (!RESIZABLE.has(file.type)) return { blob: file, width: null, height: null, name: file.name };
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  if (scale === 1 && file.size < 900_000) {
    bitmap.close();
    return { blob: file, width, height, name: file.name };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Couldn’t process that image."))), "image/webp", 0.86),
  );
  return { blob, width, height, name: file.name.replace(/\.\w+$/, "") + ".webp" };
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
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "Upload failed.");
  return result;
}

/** Turn "IMG_2041-final.jpg" into a starting point for alt text. */
export function altFromFilename(name: string) {
  return name
    .replace(/\.\w+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(img|dsc|final|copy)\b\s*\d*/gi, "")
    .trim();
}

export function formatBytes(bytes: number) {
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}
