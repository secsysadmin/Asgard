import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Studio } from "@/components/studio/Studio";
import { isAuthorized } from "@/lib/auth";
import "./studio.css";

export const metadata: Metadata = { title: "Site Studio | SEC Career Fair", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAuthorized())) notFound();
  return <Studio />;
}
