import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthorized } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";
import "./sign-in.css";

export const metadata = { title: "Staff sign in | SEC Career Fair", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await isAuthorized()) redirect("/admin");
  return <main className="signin"><div className="signin-card"><Link href="/" className="signin-brand">SEC <span>Engineering Career Fair</span></Link><h1>Staff sign in</h1><p>Sign in to manage the career fair website.</p><SignInForm /></div></main>;
}
