import { randomBytes } from "node:crypto";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { database, deploymentSchema, ensureSchema } from "@/lib/database";
import { cleanFilename, MAX_ALT_LENGTH, validateUpload } from "@/lib/media";
import { badRequest, forbidden, safeDecode, sameOrigin, serverError } from "@/lib/request";

const MEDIA_LIBRARY_LIMIT = 500;
const MAX_FILENAME_LENGTH = 120;
const MAX_IMAGE_DIMENSION = 20_000;
const MEDIA_ID_BYTES = 9;
const DEFAULT_FILENAME = "upload";

function uploadMime(request: Request) {
  return (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
}

function uploadFilename(request: Request) {
  return cleanFilename(safeDecode(request.headers.get("x-filename"), DEFAULT_FILENAME)).slice(0, MAX_FILENAME_LENGTH) || DEFAULT_FILENAME;
}

function imageDimension(request: Request, header: string) {
  const value = Math.round(Number(request.headers.get(header)));
  return value > 0 && value < MAX_IMAGE_DIMENSION ? value : null;
}

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  try {
    await ensureSchema();
    const rows = await database().query(
      `select id, filename, mime, alt, size, width, height, created_at from ${deploymentSchema()}.media_files order by created_at desc limit ${MEDIA_LIBRARY_LIMIT}`,
    );
    return Response.json(rows);
  } catch (error) {
    return serverError("Loading the media library", error, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  if (!(await isAuthorized())) return unauthorized();
  const mime = uploadMime(request);
  const bytes = Buffer.from(await request.arrayBuffer());
  const problem = validateUpload(mime, bytes);
  if (problem) return badRequest(problem);
  const filename = uploadFilename(request);
  const alt = safeDecode(request.headers.get("x-alt")).slice(0, MAX_ALT_LENGTH);
  const width = imageDimension(request, "x-width");
  const height = imageDimension(request, "x-height");
  const id = randomBytes(MEDIA_ID_BYTES).toString("base64url");
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
