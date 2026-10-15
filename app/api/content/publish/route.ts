import { revalidatePath } from "next/cache";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { publish } from "@/lib/content/store";

export async function POST(request: Request) {
  if (!(await isAuthorized())) return unauthorized();
  try {
    const body = (await request.json()) as { content?: unknown; label?: unknown };
    const result = await publish(body.content, typeof body.label === "string" ? body.label : "");
    revalidatePath("/", "layout");
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: "Couldn’t publish.", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
