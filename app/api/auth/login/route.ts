import { cookies } from "next/headers";
import { SESSION_COOKIE, authMode, createSessionToken, passwordMatches } from "@/lib/auth";

export async function POST(request: Request) {
  if (authMode() === "misconfigured")
    return Response.json({ error: "ADMIN_PASSWORD is not set for this deployment." }, { status: 503 });
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  if (authMode() === "password" && !passwordMatches(String(password ?? ""))) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return Response.json({ error: "That password isn’t right." }, { status: 401 });
  }
  const { token, maxAge } = createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return Response.json({ ok: true });
}
