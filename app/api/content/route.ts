import { isAuthorized, unauthorized } from "@/lib/auth";
import { getStudioState, saveDraft } from "@/lib/content/store";
import { badRequest, forbidden, readJson, sameOrigin, serverError } from "@/lib/request";

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  try {
    return Response.json(await getStudioState());
  } catch (error) {
    return serverError("Loading content", error, 503);
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  if (!(await isAuthorized())) return unauthorized();
  const body = await readJson(request);
  if (!body) return badRequest();
  try {
    return Response.json(await saveDraft(body));
  } catch (error) {
    return serverError("Saving the draft", error);
  }
}
