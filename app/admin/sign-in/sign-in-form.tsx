"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { JSON_HEADERS } from "@/components/studio/request";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      const result: { error?: string } = await response.json();
      if (!response.ok) { setError(result.error ?? "Sign in failed. Please try again."); return; }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="signin-form"><label>Email<input type="email" name="email" autoComplete="username" required maxLength={254} /></label><label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={1024} /></label>{error && <p className="signin-error" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form>;
}
