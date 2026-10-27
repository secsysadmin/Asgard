export const JSON_HEADERS = { "Content-Type": "application/json" };

type ErrorBody = { error?: unknown } | null;

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (response.ok) return (await response.json()) as T;
  const body: ErrorBody = await response.json().catch(() => null);
  throw new Error(typeof body?.error === "string" ? body.error : "");
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
