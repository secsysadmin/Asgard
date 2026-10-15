import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";
import { authMode, isAuthorized } from "@/lib/auth";
import { Login } from "./Login";
import "./studio.css";

export const metadata: Metadata = { title: "Site Studio | SEC Career Fair", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const mode = authMode();
  if (!(await isAuthorized())) return <Login misconfigured={mode === "misconfigured"} />;
  return <Studio authMode={mode === "open" ? "open" : "password"} />;
}
