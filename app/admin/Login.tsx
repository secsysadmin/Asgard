"use client";
import { Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";

export function Login({ misconfigured }: { misconfigured: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="st-login">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          if (response.ok) location.reload();
          else {
            setError((await response.json().catch(() => ({}))).error ?? "Sign-in failed.");
            setBusy(false);
          }
        }}
      >
        <LockKeyhole className="st-login-icon" />
        <h1>SEC Site Studio</h1>
        {misconfigured ? (
          <p className="st-error">
            Sign-in is disabled until an <code>ADMIN_PASSWORD</code> environment variable is set for this deployment.
          </p>
        ) : (
          <>
            <p>Sign in to edit the Engineering Career Fair website.</p>
            <label className="st-field">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus autoComplete="current-password" required />
            </label>
            {error && <p className="st-error" role="alert">{error}</p>}
            <button type="submit" className="st-btn st-btn-primary st-btn-block" disabled={busy}>
              {busy && <Loader2 className="st-spin" />} Sign in
            </button>
          </>
        )}
        <a href="/">← Back to the website</a>
      </form>
    </main>
  );
}
