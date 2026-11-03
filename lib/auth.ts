import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { database, deploymentSchema, ensureSchema } from "./database";
import { verifyPassword } from "./password";

type StaffUser = { email: string; password_hash: string };
type AttemptCount = { attempts: number };

const SESSION_COOKIE = "sec_staff_session";
const SESSION_BYTES = 32;
const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;
const MILLISECONDS_PER_SECOND = 1000;
const SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const LOCAL_LOGIN_BUCKET = "local";
const DUMMY_PASSWORD_HASH = `scrypt-v1$${"0".repeat(32)}$${"0".repeat(128)}`;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_LOGIN_ATTEMPTS = 20;
const INVALID_LOGIN = "Email or password is incorrect.";
const LIMITED_LOGIN = "Too many sign-in attempts. Please try again in 15 minutes.";
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 1024;
const NO_CACHE_HEADERS = { "Cache-Control": "no-store" };

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function isAuthorized() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !SESSION_TOKEN_PATTERN.test(token)) return false;
  try {
    await ensureSchema();
    const rows = await database().query(
      `select 1 from ${deploymentSchema()}.staff_sessions where token_hash = $1 and expires_at > now()`,
      [tokenHash(token)],
    );
    return rows.length > 0;
  } catch {
    console.error("Staff session validation failed");
    return false;
  }
}

export function unauthorized() {
  return Response.json({ error: "Sign in to the studio to make changes." }, { status: 401, headers: NO_CACHE_HEADERS });
}

async function allowLoginAttempt(bucket: string) {
  const schema = deploymentSchema();
  const rows = await database().query(
    `insert into ${schema}.staff_login_limits (bucket, attempts, reset_at)
     values ($1, 1, now() + $2 * interval '1 second')
     on conflict (bucket) do update set
       attempts = case when staff_login_limits.reset_at <= now() then 1 else staff_login_limits.attempts + 1 end,
       reset_at = case when staff_login_limits.reset_at <= now() then now() + $2 * interval '1 second' else staff_login_limits.reset_at end
     returning attempts`,
    [bucket, LOGIN_WINDOW_SECONDS],
  ) as AttemptCount[];
  return rows[0]?.attempts <= MAX_LOGIN_ATTEMPTS;
}

function invalidLogin() {
  return Response.json({ error: INVALID_LOGIN }, { status: 401, headers: NO_CACHE_HEADERS });
}

async function createSession(email: string, bucket: string) {
  const token = randomBytes(SESSION_BYTES).toString("hex");
  const expires = new Date(Date.now() + SESSION_LIFETIME_SECONDS * MILLISECONDS_PER_SECOND);
  const sql = database();
  const schema = deploymentSchema();
  await sql.transaction([
    sql.query(`delete from ${schema}.staff_sessions where expires_at <= now()`),
    sql.query(`insert into ${schema}.staff_sessions (token_hash, email, expires_at) values ($1, $2, $3)`, [tokenHash(token), email, expires.toISOString()]),
    sql.query(`delete from ${schema}.staff_login_limits where bucket = $1`, [bucket]),
  ]);
  (await cookies()).set(SESSION_COOKIE, token, { ...sessionCookieOptions(), expires });
}

export async function signIn(input: unknown, request: Request) {
  const address = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : LOCAL_LOGIN_BUCKET;
  const bucket = tokenHash(address || LOCAL_LOGIN_BUCKET);
  await ensureSchema();
  if (!(await allowLoginAttempt(bucket))) {
    return Response.json({ error: LIMITED_LOGIN }, {
      status: 429,
      headers: { ...NO_CACHE_HEADERS, "Retry-After": String(LOGIN_WINDOW_SECONDS) },
    });
  }
  if (!input || typeof input !== "object" || !("email" in input) || !("password" in input)) return invalidLogin();
  const { email, password } = input;
  if (typeof email !== "string" || typeof password !== "string" || email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) return invalidLogin();
  const rows = await database().query(
    `select email, password_hash from ${deploymentSchema()}.staff_users where email = $1`,
    [email.trim().toLowerCase()],
  ) as StaffUser[];
  const user = rows[0];
  const matches = await verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
  if (!user || !matches) return invalidLogin();
  await createSession(user.email, bucket);
  return Response.json({ ok: true }, { headers: NO_CACHE_HEADERS });
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && SESSION_TOKEN_PATTERN.test(token)) {
    await ensureSchema();
    await database().query(`delete from ${deploymentSchema()}.staff_sessions where token_hash = $1`, [tokenHash(token)]);
  }
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return Response.json({ ok: true }, { headers: NO_CACHE_HEADERS });
}
