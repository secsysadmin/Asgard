// Shared guards for the studio's mutating API routes.

/** Rejects cross-site requests: browsers always send Origin on these methods. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin fetches from older browsers, curl, server calls.
  try {
    return new URL(origin).host === new URL(request.url).host || origin === `https://${request.headers.get("host")}`;
  } catch {
    return false;
  }
}

export function forbidden() {
  return Response.json({ error: "Cross-site requests aren’t allowed." }, { status: 403 });
}

/**
 * Parses a JSON body, requiring the JSON content type so plain HTML forms on
 * other sites can't submit to these endpoints. Returns null on bad input.
 */
export async function readJson<T = unknown>(request: Request): Promise<T | null> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null;
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function badRequest(message = "The request was malformed.") {
  return Response.json({ error: message }, { status: 400 });
}

/** decodeURIComponent that never throws. */
export function safeDecode(value: string | null, fallback = ""): string {
  if (value == null) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return fallback;
  }
}

/** Logs the real error server-side and returns a generic response. */
export function serverError(context: string, error: unknown, status = 500) {
  console.error(`[${context}]`, error);
  return Response.json({ error: `${context} failed. Please try again.` }, { status });
}
