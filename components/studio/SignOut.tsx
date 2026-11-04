"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { JSON_HEADERS } from "./request";

type SignOutProps = { disabled?: boolean; onError: (message: string) => void };

const SIGN_OUT_ERROR = "Couldn’t sign out. Please try again.";

export function SignOut({ disabled = false, onError }: SignOutProps) {
  const router = useRouter();
  async function signOut() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: JSON_HEADERS, body: "{}" });
      if (!response.ok) throw new Error("Sign out failed");
      router.replace("/admin/sign-in");
      router.refresh();
    } catch {
      onError(SIGN_OUT_ERROR);
    }
  }
  return (
    <button type="button" className="st-btn" onClick={signOut} disabled={disabled} title="Sign out">
      <LogOut aria-hidden />
      <span className="st-btn-label">Sign out</span>
    </button>
  );
}
