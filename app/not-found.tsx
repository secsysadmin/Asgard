import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SiteChrome } from "@/components/site/PageView";
import { getPublishedContent } from "@/lib/content/store";

const GUIDE_LINKS = [
  { label: "Students", href: "/students" },
  { label: "Recruiters", href: "/recruiters" },
];

export default async function NotFound() {
  const content = await getPublishedContent();
  return (
    <SiteChrome content={content}>
      <main id="main" className="page page-landing" data-page="not-found">
        <section className="band band-pageHeader tone-plain">
          <div className="page-header">
            <div className="page-header-main">
              <p className="eyebrow">404</p>
              <h1>We couldn’t find that page.</h1>
              <div className="rich page-intro">
                <p>The link may be old or mistyped. The student and recruiter guides cover fair dates, logistics, and registration.</p>
              </div>
              <div className="actions page-header-actions">
                {GUIDE_LINKS.map((link) => (
                  <Link key={link.href} className="button" href={link.href}>
                    {link.label}
                    <ArrowRight aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
