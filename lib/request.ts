// Browsers always send Origin on cross-site mutating requests, so a missing Origin is same-origin, curl, or a server call.
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host || origin === `https://${request.headers.get("host")}`;
  } catch {
    return false;
  }
}

export function forbidden() {
  return Response.json({ error: "Cross-site requests aren’t allowed." }, { status: 403 });
}

// Requiring the JSON content type keeps plain HTML forms on other sites from submitting here.
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

export function safeDecode(value: string | null, fallback = ""): string {
  if (value == null) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return fallback;
  }
}

export function serverError(context: string, error: unknown, status = 500) {
  console.error(`[${context}]`, error);
  return Response.json({ error: `${context} failed. Please try again.` }, { status });
}
