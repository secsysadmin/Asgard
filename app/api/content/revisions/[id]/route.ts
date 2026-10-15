import { isAuthorized, unauthorized } from "@/lib/auth";
import { getRevision } from "@/lib/content/store";

export async function GET(_request: Request, ctx: RouteContext<"/api/content/revisions/[id]">) {
  if (!(await isAuthorized())) return unauthorized();
  const content = await getRevision(Number((await ctx.params).id));
  return content ? Response.json(content) : Response.json({ error: "Revision not found" }, { status: 404 });
}
