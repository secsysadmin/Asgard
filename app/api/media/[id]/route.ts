import { isAuthorized, unauthorized } from "@/lib/auth";
import { database, deploymentSchema, ensureSchema } from "@/lib/database";

type Ctx = RouteContext<"/api/media/[id]">;

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await ensureSchema();
    const rows = (await database().query(
      `select mime, data, filename from ${deploymentSchema()}.media_files where id = $1`,
      [id],
    )) as { mime: string; data: string; filename: string }[];
    if (!rows[0]) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(rows[0].data, "base64"), {
      headers: {
        "Content-Type": rows[0].mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${rows[0].filename.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
        ...(rows[0].mime === "image/svg+xml" ? { "Content-Security-Policy": "script-src 'none'" } : {}),
      },
    });
  } catch {
    return new Response("Media unavailable", { status: 503 });
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isAuthorized())) return unauthorized();
  const { alt } = (await request.json()) as { alt?: string };
  await ensureSchema();
  await database().query(`update ${deploymentSchema()}.media_files set alt = $2 where id = $1`, [
    (await ctx.params).id,
    String(alt ?? "").slice(0, 300),
  ]);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAuthorized())) return unauthorized();
  await ensureSchema();
  await database().query(`delete from ${deploymentSchema()}.media_files where id = $1`, [(await ctx.params).id]);
  return Response.json({ ok: true });
}
