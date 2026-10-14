"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { recruiterTabs, studentTabs, type Tab } from "@/lib/site-content";

function Tabs({ tabs, tone, guide }: { tabs: Tab[]; tone: "maroon" | "ink"; guide: { href: string; label: string } }) {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  const groupId = tone === "maroon" ? "student" : "recruiter";
  return <div className={`tabs ${tone}`}>
    <div className="tablist" role="tablist" aria-label={`${groupId} information sections`}>{tabs.map((item, i) => <button key={item.label} id={`${groupId}-tab-${i}`} role="tab" aria-selected={i === active} aria-controls={`${groupId}-panel-${i}`} tabIndex={i === active ? 0 : -1} onClick={() => setActive(i)} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setActive((i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length); } }}>{item.label}</button>)}</div>
    <div className="tabbody" id={`${groupId}-panel-${active}`} role="tabpanel" aria-labelledby={`${groupId}-tab-${active}`}><div className="tab-summary"><p className="tab-intro">{tab.intro}</p><h3>{tab.title}</h3><Link className={`guide-link ${tone === "maroon" ? "guide-link-light" : ""}`} href={guide.href}>{guide.label} <ArrowUpRight/></Link></div><div className="detail-list">{tab.items.map(item => <article key={item.heading}><h4>{item.heading}</h4><p>{item.detail}</p></article>)}</div></div>
  </div>;
}

const team = [
  { name: "Nathan Lam ’27", role: "Career Fair Co-Chair", major: "Computer Engineering", photo: "/images/team/nathan-lam.webp" },
  { name: "Raul Lozano ’27", role: "Career Fair Co-Chair", major: "Electrical Engineering", photo: "/images/team/raul-lozano.webp" },
  { name: "Sofia Irahola ’27", role: "Company Chat Co-Coordinator", major: "Aerospace Engineering", photo: "/images/team/sofia-irahola.webp" },
  { name: "Nayeon Lee ’28", role: "Hospitality Co-Coordinator", major: "Industrial Engineering", photo: "/images/team/nayeon-lee.webp" },
  { name: "Nikhila Manikandan ’29", role: "Marketing Co-Coordinator", major: "Computer Science", photo: "/images/team/nikhila-manikandan.webp" },
  { name: "Cathy Molyneux ’27", role: "Operations Co-Coordinator", major: "Biomedical Engineering", photo: "/images/team/cathy-molyneux.webp" }
];

export default function Home() {
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState(0);
  const [layout, setLayout] = useState<{id:string; visible:boolean}[]>([]);
  const [heroContent, setHeroContent] = useState({ headline: "SEC Engineering Career Fair", supporting: "Where Aggie engineers meet what’s next.", dates: "September 9–10, 2026", image: "" });
  useEffect(() => { fetch("/api/site-config").then(response => response.ok ? response.json() : null).then(config => { if (!config) return; setLayout(config.layout); setHeroContent(config.hero); }).catch(() => undefined); }, []);
  const sectionProps = (id: string) => { const section = layout.find(item => item.id === id); return { style: { order: section ? layout.indexOf(section) + 1 : 1 }, hidden: section ? !section.visible : false }; };
  const activeMember = team[member];
  const heroTitle = heroContent.headline.endsWith("Career Fair") ? heroContent.headline.slice(0, -"Career Fair".length).trimEnd() : heroContent.headline;
  const heroEmphasis = heroContent.headline.endsWith("Career Fair") ? "Career Fair" : "";
  return <main>
    <header className="nav"><a className="brand-lockup" href="#top" aria-label="Texas A&M Student Engineers’ Council"><Image src="/images/tamu-logo.png" alt="Texas A&M University" width={500} height={112}/><span/><Image src="/images/sec-logo.png" alt="Student Engineers’ Council" width={774} height={331}/></a><p className="nav-edition">Engineering Career Fair · 2026</p><button className="menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <X/> : <Menu/>}</button><nav className={open ? "open" : ""}><Link href="/student" onClick={() => setOpen(false)}>Students</Link><Link href="/recruiters" onClick={() => setOpen(false)}>Recruiters</Link><a href="#team" onClick={() => setOpen(false)}>The Team</a><a href="#contact" onClick={() => setOpen(false)}>Contact</a><Link className="nav-admin" href="/admin" onClick={() => setOpen(false)}>Admin</Link></nav></header>
    <section id="top" className="hero" {...sectionProps("hero")}><img src={heroContent.image || "/images/career-fair-hero.png"} alt="Engineering students arriving at a career fair"/><div className="hero-shade"/><div className="hero-copy"><h1>{heroTitle}{heroEmphasis && <><br/><em>{heroEmphasis}</em></>}</h1><div className="hero-meta"><span><CalendarDays/> {heroContent.dates}</span><span><MapPin/> Legends Event Center · Bryan, TX</span></div><Link className="button light" href="/student">Student information <ArrowUpRight/></Link><Link className="hero-text-link" href="/recruiters">Recruiter information</Link></div></section>
    <section id="dates" className="logistics" {...sectionProps("dates")}><div><h2>Fair schedule</h2></div><div className="date-grid"><article><span>Sep 8</span><h3>Pre-Fair Events</h3><p>Company Chat + Welcome Social</p></article><article><span>Sep 9–10</span><h3>In-Person Fair</h3><p>9 AM–5 PM · Legends Event Center</p></article><article><span>Sep 11</span><h3>Virtual Fair</h3><p>9 AM–5 PM · HireAggies</p></article></div></section>
    <section id="students" className="audience students" {...sectionProps("students")}><div className="section-head"><h2>Student information</h2></div><Tabs tabs={studentTabs} tone="maroon" guide={{ href: "/student", label: "View the complete student guide" }}/></section>
    <section id="recruiters" className="audience recruiters" {...sectionProps("recruiters")}><div className="section-head"><h2>Recruiter information</h2></div><Tabs tabs={recruiterTabs} tone="ink" guide={{ href: "/recruiters", label: "View the complete recruiter guide" }}/></section>
    <section id="team" className="team" {...sectionProps("team")}><h2>Students running<br/>the <em>whole show.</em></h2><div className="team-carousel" aria-roledescription="carousel" aria-label="Career Fair team"><div className="team-photo"><Image src={activeMember.photo} fill sizes="(max-width: 760px) 100vw, 55vw" style={{ objectFit: "contain", objectPosition: "center" }} alt={`${activeMember.name}, ${activeMember.role}`}/></div><div className="team-profile"><p className="member-count" aria-live="polite">{String(member + 1).padStart(2, "0")} / {String(team.length).padStart(2, "0")}</p><h3>{activeMember.name}</h3><p className="member-role">{activeMember.role}</p><p className="member-major">{activeMember.major}</p><div className="carousel-controls"><button onClick={() => setMember((member - 1 + team.length) % team.length)} aria-label="Previous team member"><ChevronLeft/></button><button onClick={() => setMember((member + 1) % team.length)} aria-label="Next team member"><ChevronRight/></button></div></div></div><div className="team-dots" role="tablist" aria-label="Team members">{team.map((person, i) => <button key={person.name} onClick={() => setMember(i)} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setMember((i + (event.key === "ArrowRight" ? 1 : -1) + team.length) % team.length); } }} aria-label={`Show ${person.name}`} aria-selected={i === member}/>)}</div></section>
    <section id="contact" className="contact" {...sectionProps("contact")}><div className="contact-title"><h2>Get in touch</h2></div><div className="contact-details"><a href="mailto:careerfair@sec.tamu.edu">careerfair@sec.tamu.edu <ArrowUpRight/></a><a className="contact-phone" href="tel:+19798478567">979.847.8567</a><p className="contact-address">125 Spence St.<br/>3127 Texas A&amp;M University<br/>College Station, TX 77843-3127</p></div></section>
    <footer><div className="footer-logos"><Image src="/images/tamu-logo.png" alt="Texas A&M University" width={500} height={112}/><Image src="/images/sec-logo.png" alt="Student Engineers’ Council" width={774} height={331}/></div><span>© 2026 Student Engineers&apos; Council</span><span>Engineering Career Fair</span><Link className="footer-admin" href="/admin">Admin</Link></footer>
  </main>;
}
