"use client";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { Block, Page, SiteContent } from "@/lib/content/types";
import { safeHref } from "@/lib/sanitize";
import { Rich, type Path, useEdit } from "../edit/context";
import { BlockView } from "./blocks";
import { revealHash } from "./reveal";
import { SmartLink } from "./SmartLink";
import { SiteSearch } from "./Search";

export function pagePath(page: Page) {
  return `/${page.slug}`;
}

function isCurrent(href: string, page: Page) {
  const path = href.split("#")[0];
  return path === pagePath(page) && page.slug !== "";
}

function Header({ content, page }: { content: SiteContent; page: Page }) {
  const [open, setOpen] = useState(false);
  const edit = useEdit();
  const { settings } = content;
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <SmartLink className="brand" href="/" aria-label={`${settings.siteName} home`}>
          <img src="/images/tamu-logo-white.svg" alt="Texas A&M University" width={183} height={28} />
          <span aria-hidden className="brand-rule" />
          <img src="/images/sec-logo-white.png" alt="Student Engineers’ Council" width={774} height={331} className="brand-sec" />
        </SmartLink>
        {!edit && <SiteSearch content={content} />}
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
          <span>Menu</span>
        </button>
        <nav id="site-nav" className={open ? "site-nav open" : "site-nav"} aria-label="Main">
          <ul>
            {settings.nav.map((link, i) => (
              <li key={i}>
                <SmartLink href={safeHref(link.href)} aria-current={isCurrent(link.href, page) ? "page" : undefined} onClick={() => setOpen(false)}>
                  {link.label}
                  {/^https?:/i.test(link.href) && <ArrowUpRight aria-hidden className="nav-external" />}
                </SmartLink>
              </li>
            ))}
          </ul>
          {settings.headerCta.label && settings.headerCta.href && (
            <SmartLink className="button button-small" href={safeHref(settings.headerCta.href)} onClick={() => setOpen(false)}>
              {settings.headerCta.label}
            </SmartLink>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer({ content }: { content: SiteContent }) {
  const { settings } = content;
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/images/tamu-logo-white.svg" alt="Texas A&M University" width={183} height={28} />
        <img src="/images/sec-logo-white.png" alt="Student Engineers’ Council" width={774} height={331} />
        <p>{settings.footerNote}</p>
      </div>
      <nav aria-label="Footer">
        <ul>
          <li>
            <SmartLink href="/">Home</SmartLink>
          </li>
          {settings.nav.map((link, i) => (
            <li key={i}>
              <SmartLink href={safeHref(link.href)}>{link.label}</SmartLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="footer-contact">
        <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
        <span>© {new Date().getFullYear()} Student Engineers’ Council</span>
        <SmartLink className="footer-staff" href="/admin">
          Staff sign-in
        </SmartLink>
      </div>
    </footer>
  );
}

type Group = { title: string; items: { id: string; label: string }[] };

function tocGroups(blocks: Block[]): Group[] {
  const groups: Group[] = [];
  for (const block of blocks) {
    if (!block.visible || !block.nav) continue;
    const last = groups[groups.length - 1];
    if (last && last.title === block.group) last.items.push({ id: block.id, label: block.nav });
    else groups.push({ title: block.group, items: [{ id: block.id, label: block.nav }] });
  }
  return groups;
}

function useActiveSection(ids: string[], enabled: boolean) {
  const [active, setActive] = useState(ids[0] ?? "");
  const key = ids.join("|");
  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => {
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 160) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return active;
}

function Toc({ groups }: { groups: Group[] }) {
  const edit = useEdit();
  const ids = groups.flatMap((group) => group.items.map((item) => item.id));
  const active = useActiveSection(ids, !edit);
  const [open, setOpen] = useState(false);
  const activeLabel = groups.flatMap((group) => group.items).find((item) => item.id === active)?.label ?? "Sections";
  if (!groups.length) return null;
  return (
    <nav className={open ? "toc open" : "toc"} aria-label="On this page">
      <button type="button" className="toc-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="toc-toggle-label">On this page</span>
        <span className="toc-toggle-current">{activeLabel}</span>
        <ChevronDown aria-hidden />
      </button>
      <div className="toc-panel">
        <p className="toc-title">On this page</p>
        {groups.map((group, i) => (
          <div className="toc-group" key={i}>
            {group.title && <p>{group.title}</p>}
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} aria-current={item.id === active ? "true" : undefined} onClick={() => setOpen(false)}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

export type SectionWrapper = (block: Block, index: number, node: ReactNode) => ReactNode;

const defaultWrap: SectionWrapper = (block, _index, node) => (
  <section
    key={block.id}
    id={block.id}
    className={`band band-${block.type} tone-${block.tone}`}
    aria-label={block.nav || undefined}
    hidden={!block.visible}
  >
    {node}
  </section>
);

export function PageView({
  content,
  pageIndex,
  wrap = defaultWrap,
  basePath = ["pages", pageIndex, "blocks"],
}: {
  content: SiteContent;
  pageIndex: number;
  wrap?: SectionWrapper;
  basePath?: Path;
}) {
  const edit = useEdit();
  const page = content.pages[pageIndex];
  // Links to an FAQ question (from search or shared URLs) open its answer.
  useEffect(() => {
    if (edit) return;
    const onHash = () => revealHash(location.hash);
    if (location.hash) requestAnimationFrame(onHash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [edit]);
  const render = (block: Block, index: number) => wrap(block, index, <BlockView block={block} at={[...basePath, index, "data"]} />);
  const indexed = page.blocks.map((block, index) => ({ block, index }));
  const lead = page.layout === "guide" && page.blocks[0]?.type === "pageHeader" ? indexed.slice(0, 1) : [];
  const body = indexed.slice(lead.length);
  return (
    <div className="site">
      <a className="skip-link" href="#main">Skip to content</a>
      {(content.settings.announcement || edit) && (
        <div className="announcement">
          <Rich value={content.settings.announcement} path={["settings", "announcement"]} placeholder="Site-wide announcement (leave empty to hide)" />
        </div>
      )}
      <Header content={content} page={page} />
      <main id="main" className={`page page-${page.layout}`}>
        {lead.map(({ block, index }) => render(block, index))}
        {page.layout === "guide" ? (
          <div className="guide">
            <Toc groups={tocGroups(page.blocks)} />
            <div className="guide-body">{body.map(({ block, index }) => render(block, index))}</div>
          </div>
        ) : (
          body.map(({ block, index }) => render(block, index))
        )}
      </main>
      <Footer content={content} />
    </div>
  );
}
