import { isAuthorized, unauthorized } from "@/lib/auth";
import { getRevision } from "@/lib/content/store";
import { badRequest, serverError } from "@/lib/request";

export async function GET(_request: Request, ctx: RouteContext<"/api/content/revisions/[id]">) {
  if (!(await isAuthorized())) return unauthorized();
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id < 1) return badRequest();
  try {
    const content = await getRevision(id);
    return content ? Response.json(content) : Response.json({ error: "Revision not found" }, { status: 404 });
  } catch (error) {
    return serverError("Loading the revision", error);
  }
}
