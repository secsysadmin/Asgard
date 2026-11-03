import { signOut } from "@/lib/auth";
import { forbidden, readJson, sameOrigin, serverError } from "@/lib/request";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  if (!(await readJson(request))) return forbidden();
  try {
    return await signOut();
  } catch {
    return serverError("Staff sign-out", new Error("Authentication service unavailable"), 503);
  }
}
