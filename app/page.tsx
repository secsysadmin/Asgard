"use client";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Menu,
  X,
} from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import { recruiterTabs, studentTabs, type Tab } from "@/lib/site-content";

function Tabs({
  tabs,
  tone,
  guide,
}: {
  tabs: Tab[];
  tone: "maroon" | "ink";
  guide: { href: string; label: string };
}) {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  const groupId = tone === "maroon" ? "student" : "recruiter";
  return (
    <div className={`tabs ${tone}`}>
      <div
        className="tablist"
        role="tablist"
        aria-label={`${groupId} information sections`}
      >
        {tabs.map((item, i) => (
          <button
            key={item.label}
            id={`${groupId}-tab-${i}`}
            role="tab"
            aria-selected={i === active}
            aria-controls={`${groupId}-panel-${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                setActive(
                  (i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                    tabs.length,
                );
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="tabbody"
        id={`${groupId}-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`${groupId}-tab-${active}`}
      >
        <div className="tab-summary">
          <p className="tab-intro">{tab.intro}</p>
          <h3>{tab.title}</h3>
          <Link
            className={`guide-link ${tone === "maroon" ? "guide-link-light" : ""}`}
            href={guide.href}
          >
            {guide.label} <ArrowUpRight />
          </Link>
        </div>
        <div className="detail-list">
          {tab.items.map((item) => (
            <article key={item.heading}>
              <h4>{item.heading}</h4>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

const team = [
  {
    name: "Nathan Lam ’27",
    role: "Career Fair Co-Chair",
    major: "Computer Engineering",
    photo: "/images/team/nathan-lam.webp",
  },
  {
    name: "Raul Lozano ’27",
    role: "Career Fair Co-Chair",
    major: "Electrical Engineering",
    photo: "/images/team/raul-lozano.webp",
  },
  {
    name: "Sofia Irahola ’27",
    role: "Company Chat Co-Coordinator",
    major: "Aerospace Engineering",
    photo: "/images/team/sofia-irahola.webp",
  },
  {
    name: "Nayeon Lee ’28",
    role: "Hospitality Co-Coordinator",
    major: "Industrial Engineering",
    photo: "/images/team/nayeon-lee.webp",
  },
  {
    name: "Nikhila Manikandan ’29",
    role: "Marketing Co-Coordinator",
    major: "Computer Science",
    photo: "/images/team/nikhila-manikandan.webp",
  },
  {
    name: "Cathy Molyneux ’27",
    role: "Operations Co-Coordinator",
    major: "Biomedical Engineering",
    photo: "/images/team/cathy-molyneux.webp",
  },
];

export default function Home() {
  const [open, setOpen] = useState(false);
  const [teamStart, setTeamStart] = useState(0);
  const [layout, setLayout] = useState<{ id: string; visible: boolean }[]>([]);
  const [heroContent, setHeroContent] = useState({
    headline: "SEC Engineering Career Fair",
    supporting: "Where Aggie engineers meet what’s next.",
    dates: "September 9–10, 2026",
    image: "",
  });
  const [images, setImages] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/site-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (!config) return;
        setLayout(config.layout);
        setHeroContent(config.hero);
        setImages(config.images ?? {});
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const receiveDraft = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== "site-studio-draft"
      )
        return;
      const draft = event.data.config;
      if (Array.isArray(draft?.layout)) setLayout(draft.layout);
      if (draft?.hero) setHeroContent(draft.hero);
      if (draft?.images) setImages(draft.images);
    };
    window.addEventListener("message", receiveDraft);
    return () => window.removeEventListener("message", receiveDraft);
  }, []);
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: "site-studio-ready" },
        window.location.origin,
      );
    }
  }, []);
  const moveTeam = (direction: 1 | -1) => {
    setTeamStart(
      (start) => (start + direction * 3 + team.length) % team.length,
    );
  };
  const sectionProps = (id: string) => {
    const section = layout.find((item) => item.id === id);
    return {
      style: { order: section ? layout.indexOf(section) + 1 : 1 },
      hidden: section ? !section.visible : false,
    };
  };
  const visibleTeam = Array.from({ length: 3 }, (_, offset) => {
    const index = (teamStart + offset) % team.length;
    return {
      ...team[index],
      index,
      photo: images[`team-${index}`] || team[index].photo,
    };
  });
  const heroTitle = heroContent.headline.endsWith("Career Fair")
    ? heroContent.headline.slice(0, -"Career Fair".length).trimEnd()
    : heroContent.headline;
  const heroEmphasis = heroContent.headline.endsWith("Career Fair")
    ? "Career Fair"
    : "";
  return (
    <main>
      <header className="nav">
        <a
          className="brand-lockup"
          href="#top"
          aria-label="Texas A&M Student Engineers’ Council"
        >
          <Image
            src="/images/tamu-logo.png"
            alt="Texas A&M University"
            width={500}
            height={112}
          />
          <span />
          <Image
            src="/images/sec-logo.png"
            alt="Student Engineers’ Council"
            width={774}
            height={331}
          />
        </a>
        <button
          className="menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "open" : ""}>
          <a href="#students" onClick={() => setOpen(false)}>
            Students
          </a>
          <a href="#recruiters" onClick={() => setOpen(false)}>
            Recruiters
          </a>
          <a href="#team" onClick={() => setOpen(false)}>
            The Team
          </a>
          <a href="#contact" onClick={() => setOpen(false)}>
            Contact
          </a>
          <Link
            className="nav-admin"
            href="/admin"
            onClick={() => setOpen(false)}
          >
            Admin
          </Link>
        </nav>
      </header>
      <section id="top" className="hero" {...sectionProps("hero")}>
        <img
          src={heroContent.image || "/images/career-fair-hero.png"}
          alt="Engineering students arriving at a career fair"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <h1>
            {heroTitle}
            {heroEmphasis && (
              <>
                <br />
                <em>{heroEmphasis}</em>
              </>
            )}
          </h1>
          <div className="hero-meta">
            <span>
              <CalendarDays /> {heroContent.dates}
            </span>
            <span>
              <MapPin /> Legends Event Center · Bryan, TX
            </span>
          </div>
          <Link className="button light" href="/student">
            Student information <ArrowUpRight />
          </Link>
          <Link className="hero-text-link" href="/recruiters">
            Recruiter information
          </Link>
        </div>
      </section>
      <section id="stats" className="fair-stats" {...sectionProps("stats")}>
        <div className="stats-intro">
          <h2>About the fair</h2>
          <p>
            The SEC Engineering Career Fair is planned, organized, and staffed
            by students—bringing engineering talent and industry together at
            scale.
          </p>
        </div>
        <dl className="stats-list">
          <div>
            <dt>500+</dt>
            <dd>Companies attending</dd>
          </div>
          <div>
            <dt>12,000+</dt>
            <dd>Students attending</dd>
          </div>
          <div>
            <dt>#1</dt>
            <dd>Largest student-run career fair in the nation</dd>
          </div>
        </dl>
      </section>
      <section id="dates" className="logistics" {...sectionProps("dates")}>
        <div>
          <h2>Fair schedule</h2>
        </div>
        <div className="date-grid">
          <article>
            <span>Sep 8</span>
            <h3>Pre-Fair Events</h3>
            <p>Company Chat + Welcome Social</p>
          </article>
          <article>
            <span>Sep 9–10</span>
            <h3>In-Person Fair</h3>
            <p>9 AM–5 PM · Legends Event Center</p>
          </article>
          <article>
            <span>Sep 11</span>
            <h3>Virtual Fair</h3>
            <p>9 AM–5 PM · HireAggies</p>
          </article>
        </div>
      </section>
      <section
        id="students"
        className="audience students"
        {...sectionProps("students")}
      >
        <div className="section-head">
          <h2>Student information</h2>
        </div>
        <Tabs
          tabs={studentTabs}
          tone="maroon"
          guide={{ href: "/student", label: "View the complete student guide" }}
        />
      </section>
      <section
        id="recruiters"
        className="audience recruiters"
        {...sectionProps("recruiters")}
      >
        <div className="section-head">
          <h2>Recruiter information</h2>
        </div>
        <Tabs
          tabs={recruiterTabs}
          tone="ink"
          guide={{
            href: "/recruiters",
            label: "View the complete recruiter guide",
          }}
        />
      </section>
      <section id="team" className="team" {...sectionProps("team")}>
        <h2>
          Students running
          <br />
          the <em>whole show.</em>
        </h2>
        <div className="team-conveyor" aria-label="Career Fair team">
          <div className="team-track" key={teamStart}>
            {visibleTeam.map((person, position) => (
              <article
                className="team-card"
                key={person.name}
                style={
                  { "--team-delay": `${position * 110}ms` } as CSSProperties
                }
              >
                <div className="team-card-photo">
                  <Image
                    src={person.photo}
                    fill
                    sizes="(max-width: 760px) 100vw, 33vw"
                    style={{ objectFit: "cover", objectPosition: "center 18%" }}
                    alt={`${person.name}, ${person.role}`}
                  />
                </div>
                <div className="team-card-copy">
                  <p className="member-count">
                    {String(person.index + 1).padStart(2, "0")} /{" "}
                    {String(team.length).padStart(2, "0")}
                  </p>
                  <h3>{person.name}</h3>
                  <p className="member-role">{person.role}</p>
                  <p className="member-major">{person.major}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="team-conveyor-controls">
          <p>
            {String(teamStart + 1).padStart(2, "0")}–
            {String(Math.min(teamStart + 3, team.length)).padStart(2, "0")} of{" "}
            {String(team.length).padStart(2, "0")}
          </p>
          <div className="carousel-controls">
            <button
              onClick={() => moveTeam(-1)}
              aria-label="Previous team group"
            >
              <ChevronLeft />
            </button>
            <button onClick={() => moveTeam(1)} aria-label="Next team group">
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>
      <section id="contact" className="contact" {...sectionProps("contact")}>
        <div className="contact-title">
          <p className="contact-eyebrow">Contact</p>
          <h2>Get in touch</h2>
          <p>
            Questions about the Engineering Career Fair, registration, or event
            logistics? Reach out and our team will help.
          </p>
        </div>
        <div className="contact-details">
          <div className="contact-stack">
            <div>
              <span>Email</span>
              <a href="mailto:careerfair@sec.tamu.edu">
                careerfair@sec.tamu.edu <ArrowUpRight />
              </a>
            </div>
            <div>
              <span>Phone</span>
              <a className="contact-phone" href="tel:+19798478567">
                979.847.8567
              </a>
            </div>
            <div>
              <span>Mailing address</span>
              <p className="contact-address">
                125 Spence St.
                <br />
                3127 Texas A&amp;M University
                <br />
                College Station, TX 77843-3127
              </p>
            </div>
          </div>
        </div>
      </section>
      <footer>
        <div className="footer-logos">
          <Image
            src="/images/tamu-logo.png"
            alt="Texas A&M University"
            width={500}
            height={112}
          />
          <Image
            src="/images/sec-logo.png"
            alt="Student Engineers’ Council"
            width={774}
            height={331}
          />
        </div>
        <span>© 2026 Student Engineers&apos; Council</span>
        <span>Engineering Career Fair</span>
        <Link className="footer-admin" href="/admin">
          Admin
        </Link>
      </footer>
    </main>
  );
}
