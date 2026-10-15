import { isAuthorized, unauthorized } from "@/lib/auth";
import { database, deploymentSchema, ensureSchema } from "@/lib/database";
import { MEDIA_ID, mediaHeaders } from "@/lib/media";
import { badRequest, forbidden, readJson, sameOrigin, serverError } from "@/lib/request";

type Ctx = RouteContext<"/api/media/[id]">;

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!MEDIA_ID.test(id)) return notFound();
  try {
    await ensureSchema();
    const rows = (await database().query(
      `select mime, data, filename from ${deploymentSchema()}.media_files where id = $1`,
      [id],
    )) as { mime: string; data: string; filename: string }[];
    if (!rows[0]) return notFound();
    return new Response(Buffer.from(rows[0].data, "base64"), { headers: mediaHeaders(rows[0].mime, rows[0].filename) });
  } catch (error) {
    console.error("[media]", error);
    return new Response("Media unavailable", { status: 503 });
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!sameOrigin(request)) return forbidden();
  if (!(await isAuthorized())) return unauthorized();
  const { id } = await ctx.params;
  const body = await readJson<{ alt?: unknown }>(request);
  if (!MEDIA_ID.test(id) || !body) return badRequest();
  try {
    await ensureSchema();
    await database().query(`update ${deploymentSchema()}.media_files set alt = $2 where id = $1`, [
      id,
      String(body.alt ?? "").slice(0, 300),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return serverError("Saving alt text", error);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  if (!sameOrigin(request)) return forbidden();
  if (!(await isAuthorized())) return unauthorized();
  const { id } = await ctx.params;
  if (!MEDIA_ID.test(id)) return badRequest();
  try {
    await ensureSchema();
    await database().query(`delete from ${deploymentSchema()}.media_files where id = $1`, [id]);
    return Response.json({ ok: true });
  } catch (error) {
    return serverError("Deleting the file", error);
  }
}
