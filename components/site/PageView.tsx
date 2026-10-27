"use client";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { Block, Page, SiteContent } from "@/lib/content/types";
import { safeHref } from "@/lib/sanitize";
import { Rich, type Path, useEdit } from "../edit/context";
import { BlockView } from "./blocks";
import { decodeHash, onReaderScroll, revealHash } from "./reveal";
import { isExternalHref, SmartLink } from "./SmartLink";
import { SiteSearch } from "./Search";

export type SectionWrapper = (block: Block, index: number, node: ReactNode) => ReactNode;

type TocGroup = { title: string; items: { id: string; label: string }[] };
type LogoProps = { className?: string };
type HeaderProps = { content: SiteContent; page: Page };
type FooterProps = { content: SiteContent };
type TocProps = { groups: TocGroup[] };
type Props = {
  content: SiteContent;
  pageIndex: number;
  wrap?: SectionWrapper;
  basePath?: Path;
};

const LOGO_ALT = "Student Engineers’ Council";
const LOGO_SRC = "/images/sec-logo-white.png";
const LOGO_WIDTH = 774;
const LOGO_HEIGHT = 331;
const ACTIVE_SECTION_OFFSET_PX = 160;
const PAGE_BOTTOM_TOLERANCE_PX = 4;

const pagePath = (page: Page) => `/${page.slug}`;

function isCurrent(href: string, page: Page) {
  const path = href.split("#")[0];
  return path === pagePath(page) && page.slug !== "";
}

function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node && ref.current?.contains(event.target))) close();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, close]);
}

function SecLogo({ className }: LogoProps) {
  return <img src={LOGO_SRC} alt={LOGO_ALT} width={LOGO_WIDTH} height={LOGO_HEIGHT} className={className} />;
}

function Header({ content, page }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  useDismiss(header, open, useCallback(() => setOpen(false), []));
  const edit = useEdit();
  const { settings } = content;
  return (
    <header ref={header} className="site-header">
      <div className="site-header-inner">
        <SmartLink className="brand" href="/" aria-label={`${settings.siteName} home`}>
          <SecLogo className="brand-sec" />
        </SmartLink>
        {!edit && <SiteSearch content={content} />}
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? "Close menu" : "Open menu"}
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
                  {isExternalHref(link.href) && <ArrowUpRight aria-hidden className="nav-external" />}
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

function Footer({ content }: FooterProps) {
  const { settings } = content;
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <SecLogo />
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

function tocGroups(blocks: Block[]): TocGroup[] {
  const groups: TocGroup[] = [];
  for (const block of blocks) {
    if (!block.visible || !block.nav) continue;
    const last = groups[groups.length - 1];
    if (last && last.title === block.group) last.items.push({ id: block.id, label: block.nav });
    else groups.push({ title: block.group, items: [{ id: block.id, label: block.nav }] });
  }
  return groups;
}

function sectionUnderHeader(ids: string[]) {
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - PAGE_BOTTOM_TOLERANCE_PX;
  let current = ids[0] ?? "";
  if (atBottom) return ids[ids.length - 1] ?? current;
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top < ACTIVE_SECTION_OFFSET_PX) current = id;
  }
  return current;
}

function useActiveSection(ids: string[], enabled: boolean) {
  const [active, setActive] = useState(ids[0] ?? "");
  const pinned = useRef<string | null>(null);
  const key = ids.join("|");

  const sectionContaining = useCallback(
    (anchor: string) => {
      if (ids.includes(anchor)) return anchor;
      const section = document.getElementById(anchor)?.closest("section[id]")?.id;
      return section && ids.includes(section) ? section : null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const pin = useCallback(
    (anchor: string) => {
      const section = sectionContaining(anchor);
      if (!section) return;
      pinned.current = section;
      setActive(section);
    },
    [sectionContaining],
  );

  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => setActive(pinned.current ?? sectionUnderHeader(ids));
    const onHash = () => pin(decodeHash(location.hash));
    const highlightInitialSection = () => {
      if (location.hash) onHash();
      onScroll();
    };
    const frame = requestAnimationFrame(highlightInitialSection);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onHash);
    const stopReleasing = onReaderScroll(() => {
      pinned.current = null;
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHash);
      stopReleasing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, pin]);

  return { active, pin };
}

function useRevealLinkedAnswer(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onHash = () => revealHash(location.hash);
    if (location.hash) requestAnimationFrame(onHash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [enabled]);
}

function Toc({ groups }: TocProps) {
  const edit = useEdit();
  const ids = groups.flatMap((group) => group.items.map((item) => item.id));
  const { active, pin } = useActiveSection(ids, !edit);
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  useDismiss(nav, open, useCallback(() => setOpen(false), []));
  const activeLabel = groups.flatMap((group) => group.items).find((item) => item.id === active)?.label ?? "Sections";
  if (!groups.length) return null;
  return (
    <nav ref={nav} className={open ? "toc open" : "toc"} aria-label="On this page">
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
                  <a
                    href={`#${item.id}`}
                    aria-current={item.id === active ? "true" : undefined}
                    onClick={() => {
                      pin(item.id);
                      setOpen(false);
                    }}
                  >
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

export function PageView({ content, pageIndex, wrap = defaultWrap, basePath = ["pages", pageIndex, "blocks"] }: Props) {
  const edit = useEdit();
  const page = content.pages[pageIndex];
  useRevealLinkedAnswer(!edit);
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
      <main id="main" className={`page page-${page.layout}`} data-page={page.slug || "home"}>
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
