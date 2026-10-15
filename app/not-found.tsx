import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404</p>
      <h1>We couldn’t find that page.</h1>
      <p>
        Try the <Link href="/students">student guide</Link>, the <Link href="/recruiters">recruiter guide</Link>, or go back to the{" "}
        <Link href="/">home page</Link>.
      </p>
    </main>
  );
}
