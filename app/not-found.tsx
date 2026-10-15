export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404</p>
      <h1>We couldn’t find that page.</h1>
      <p>
        Try the <a href="/students">student guide</a>, the <a href="/recruiters">recruiter guide</a>, or go back to the{" "}
        <a href="/">home page</a>.
      </p>
    </main>
  );
}
