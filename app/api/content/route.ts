import { isAuthorized, unauthorized } from "@/lib/auth";
import { getStudioState, saveDraft } from "@/lib/content/store";

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  try {
    return Response.json(await getStudioState());
  } catch (error) {
    return Response.json(
      { error: "The content database is unavailable.", detail: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  if (!(await isAuthorized())) return unauthorized();
  try {
    return Response.json(await saveDraft(await request.json()));
  } catch (error) {
    return Response.json(
      { error: "Couldn’t save the draft.", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
