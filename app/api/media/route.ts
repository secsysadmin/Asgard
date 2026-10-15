import { randomBytes } from "node:crypto";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { database, deploymentSchema, ensureSchema } from "@/lib/database";
import { validateUpload } from "@/lib/media";
import { badRequest, forbidden, safeDecode, sameOrigin, serverError } from "@/lib/request";

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  try {
    await ensureSchema();
    const rows = await database().query(
      `select id, filename, mime, alt, size, width, height, created_at from ${deploymentSchema()}.media_files order by created_at desc limit 500`,
    );
    return Response.json(rows);
  } catch (error) {
    return serverError("Loading the media library", error, 503);
  }
}

// Body is the raw file; metadata travels in headers so no multipart parsing is needed.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  if (!(await isAuthorized())) return unauthorized();
  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const bytes = Buffer.from(await request.arrayBuffer());
  const problem = validateUpload(mime, bytes);
  if (problem) return badRequest(problem);
  const filename = safeDecode(request.headers.get("x-filename"), "upload").replace(/[^\w.\- ]+/g, "").slice(0, 120) || "upload";
  const alt = safeDecode(request.headers.get("x-alt")).slice(0, 300);
  const dimension = (header: string) => {
    const value = Math.round(Number(request.headers.get(header)));
    return value > 0 && value < 20_000 ? value : null;
  };
  const width = dimension("x-width");
  const height = dimension("x-height");
  const id = randomBytes(9).toString("base64url");
  try {
    await ensureSchema();
    await database().query(
      `insert into ${deploymentSchema()}.media_files (id, filename, mime, alt, size, width, height, data) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, filename, mime, alt, bytes.length, width, height, bytes.toString("base64")],
    );
    return Response.json({ id, url: `/api/media/${id}`, filename, mime, alt, size: bytes.length, width, height });
  } catch (error) {
    return serverError("Upload", error);
  }
}
