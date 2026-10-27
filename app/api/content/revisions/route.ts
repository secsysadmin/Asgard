import { isAuthorized, unauthorized } from "@/lib/auth";
import { listRevisions } from "@/lib/content/store";

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  try {
    return Response.json(await listRevisions());
  } catch (error) {
    console.error("[Loading revisions]", error);
    return Response.json([], { status: 503 });
  }
}
