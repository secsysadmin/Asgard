import { signIn } from "@/lib/auth";
import { forbidden, readJson, sameOrigin, serverError } from "@/lib/request";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  try {
    return await signIn(await readJson(request), request);
  } catch {
    return serverError("Staff sign-in", new Error("Authentication service unavailable"), 503);
  }
}
