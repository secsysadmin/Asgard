"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function signOut() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Sign out failed");
      router.replace("/admin/sign-in");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }
  return <><button type="button" className="st-btn" onClick={signOut}>Sign out</button>{error && <span role="alert">{error}</span>}</>;
}
