"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = { error: Error & { digest?: string }; retry: () => void };

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(`Page failed to render (digest ${error.digest ?? "none"})`, error);
  }, [error]);
  return (
    <div className="site">
      <main id="main" className="page page-landing" data-page="error">
        <section className="band band-pageHeader tone-plain">
          <div className="page-header">
            <div className="page-header-main">
              <p className="eyebrow">Something went wrong</p>
              <h1>This page didn’t load.</h1>
              <div className="rich page-intro">
                <p>It’s usually a temporary problem on our end. Try again, or head back to the home page.</p>
              </div>
              <div className="actions page-header-actions">
                <button type="button" className="button" onClick={retry}>
                  Try again
                </button>
                <Link className="button button-quiet" href="/">
                  Home
                  <ArrowRight aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
