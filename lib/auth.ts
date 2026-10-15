import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sec_studio";
const SESSION_DAYS = 14;

/**
 * Deployed sites always require ADMIN_PASSWORD. Local development without a
 * password stays open so the studio works out of the box.
 */
export function authMode(): "open" | "password" | "misconfigured" {
  if (process.env.ADMIN_PASSWORD) return "password";
  return process.env.VERCEL || process.env.NODE_ENV === "production" ? "misconfigured" : "open";
}

function key() {
  const secret = process.env.ADMIN_SESSION_SECRET || `${process.env.ADMIN_PASSWORD}:${process.env.DATABASE_URL ?? ""}`;
  return createHash("sha256").update(secret).digest();
}

const sign = (value: string) => createHmac("sha256", key()).update(value).digest("base64url");

export function createSessionToken() {
  const expires = String(Date.now() + SESSION_DAYS * 86_400_000);
  return { token: `${expires}.${sign(expires)}`, maxAge: SESSION_DAYS * 86_400 };
}

function validToken(token: string | undefined) {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = Buffer.from(sign(expires));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function passwordMatches(candidate: string) {
  const expected = createHash("sha256").update(process.env.ADMIN_PASSWORD ?? "").digest();
  const actual = createHash("sha256").update(candidate).digest();
  return !!process.env.ADMIN_PASSWORD && timingSafeEqual(expected, actual);
}

export async function isAuthorized() {
  const mode = authMode();
  if (mode === "open") return true;
  if (mode === "misconfigured") return false;
  return validToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export function unauthorized() {
  return Response.json({ error: "Sign in to the studio to make changes." }, { status: 401 });
}
