import { revalidatePath } from "next/cache";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { publish } from "@/lib/content/store";
import { badRequest, forbidden, readJson, sameOrigin, serverError } from "@/lib/request";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  if (!(await isAuthorized())) return unauthorized();
  const body = await readJson<{ content?: unknown; label?: unknown }>(request);
  if (!body?.content) return badRequest();
  try {
    const result = await publish(body.content, typeof body.label === "string" ? body.label : "");
    revalidatePath("/", "layout");
    return Response.json(result);
  } catch (error) {
    return serverError("Publishing", error);
  }
}
