import { randomBytes } from "node:crypto";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { database, deploymentSchema, ensureSchema } from "@/lib/database";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml", "application/pdf"]);
const MAX_BYTES = 4 * 1024 * 1024;

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  try {
    await ensureSchema();
    const rows = await database().query(
      `select id, filename, mime, alt, size, width, height, created_at from ${deploymentSchema()}.media_files order by created_at desc limit 500`,
    );
    return Response.json(rows);
  } catch (error) {
    return Response.json({ error: "Media library unavailable", detail: String(error) }, { status: 503 });
  }
}

// Body is the raw file; metadata travels in headers so no multipart parsing is needed.
export async function POST(request: Request) {
  if (!(await isAuthorized())) return unauthorized();
  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED.has(mime)) return Response.json({ error: "Upload a JPG, PNG, WebP, GIF, AVIF, SVG, or PDF." }, { status: 415 });
  const bytes = Buffer.from(await request.arrayBuffer());
  if (!bytes.length) return Response.json({ error: "The file is empty." }, { status: 400 });
  if (bytes.length > MAX_BYTES) return Response.json({ error: "Files must be under 4 MB." }, { status: 413 });
  if (mime === "image/svg+xml" && /<script|on\w+\s*=|javascript:/i.test(bytes.toString("utf8")))
    return Response.json({ error: "That SVG contains scripts and can’t be used." }, { status: 400 });
  const filename = decodeURIComponent(request.headers.get("x-filename") ?? "upload").replace(/[^\w.\- ]+/g, "").slice(0, 120) || "upload";
  const alt = decodeURIComponent(request.headers.get("x-alt") ?? "").slice(0, 300);
  const width = Number(request.headers.get("x-width")) || null;
  const height = Number(request.headers.get("x-height")) || null;
  const id = randomBytes(9).toString("base64url");
  try {
    await ensureSchema();
    await database().query(
      `insert into ${deploymentSchema()}.media_files (id, filename, mime, alt, size, width, height, data) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, filename, mime, alt, bytes.length, width, height, bytes.toString("base64")],
    );
    return Response.json({ id, url: `/api/media/${id}`, filename, mime, alt, size: bytes.length, width, height });
  } catch (error) {
    return Response.json({ error: "Upload failed", detail: String(error) }, { status: 500 });
  }
}
