"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { recruiterTabs, studentTabs, type Tab } from "@/lib/site-content";

function Tabs({ tabs, tone }: { tabs: Tab[]; tone: "maroon" | "ink" }) {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  return <div className={`tabs ${tone}`}>
    <div className="tablist" role="tablist" aria-label="Information sections">{tabs.map((item, i) => <button key={item.label} role="tab" aria-selected={i === active} onClick={() => setActive(i)}>{item.label}</button>)}</div>
    <div className="tabbody"><div><p className="tab-intro">{tab.intro}</p><h3>{tab.title}</h3></div><div className="detail-list">{tab.items.map(item => <article key={item.heading}><h4>{item.heading}</h4><p>{item.detail}</p></article>)}</div></div>
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
  const [heroContent, setHeroContent] = useState({ headline: "Engineering Career Fair", supporting: "Where Aggie engineers meet what’s next.", dates: "September 9–10, 2026", image: "" });
  useEffect(() => { const savedLayout = localStorage.getItem("cf-layout"); const savedHero = localStorage.getItem("cf-hero"); if(savedLayout) { try { const parsed = JSON.parse(savedLayout); if(Array.isArray(parsed)) setLayout(parsed.filter(item => item && typeof item.id === "string")); } catch { localStorage.removeItem("cf-layout"); } } if(savedHero) { try { const parsed = JSON.parse(savedHero); setHeroContent(current => ({ headline: typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline.trim() : current.headline, supporting: typeof parsed.supporting === "string" && parsed.supporting.trim() ? parsed.supporting.trim() : current.supporting, dates: typeof parsed.dates === "string" && parsed.dates.trim() ? parsed.dates.trim() : current.dates, image: typeof parsed.image === "string" ? parsed.image : current.image })); } catch { localStorage.removeItem("cf-hero"); } } }, []);
  const sectionProps = (id: string) => { const section = layout.find(item => item.id === id); return { style: { order: section ? layout.indexOf(section) + 1 : 1 }, hidden: section ? !section.visible : false }; };
  const activeMember = team[member];
  return <main>
    <header className="nav"><a className="brand-lockup" href="#top" aria-label="Texas A&M Student Engineers’ Council"><Image src="/images/tamu-logo.png" alt="Texas A&M University" width={500} height={112}/><span/><Image src="/images/sec-logo.png" alt="Student Engineers’ Council" width={774} height={331}/></a><button className="menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X/> : <Menu/>}</button><nav className={open ? "open" : ""}><a href="#students">Students</a><a href="#recruiters">Recruiters</a><a href="#team">The Team</a><a href="#contact">Contact</a><Link className="nav-admin" href="/admin">Admin</Link></nav></header>
    <section id="top" className="hero" {...sectionProps("hero")}><img src={heroContent.image || "/images/career-fair-hero.png"} alt="Engineering students arriving at a career fair"/><div className="hero-shade"/><div className="hero-copy"><p className="hero-mark">SEC / TAMU</p><h1>{heroContent.headline.split(" ").slice(0,-2).join(" ")}<br/><em>{heroContent.headline.split(" ").slice(-2).join(" ")}</em></h1><p className="hero-sub">{heroContent.supporting}</p><div className="hero-meta"><span><CalendarDays/> {heroContent.dates}</span><span><MapPin/> Legends Event Center · Bryan, TX</span></div><a className="button light" href="#students">Explore the fair <ArrowUpRight/></a></div><div className="hero-rail">500+ companies &nbsp; / &nbsp; 12,000+ students &nbsp; / &nbsp; student-run since 1980</div></section>
    <section id="intro" className="intro" {...sectionProps("intro")}><p>Not just a job fair.</p><h2>The room where<br/>engineering takes <em>shape.</em></h2><p className="intro-copy">Planned, organized, and staffed by the Student Engineers&apos; Council, this is a two-day collision of preparation, possibility, and the people who make things real.</p></section>
    <section id="students" className="audience students" {...sectionProps("students")}><div className="section-label">For students</div><div className="section-head"><h2>Bring your<br/><em>next move.</em></h2><p>Find internship, co-op, and full-time opportunities with companies looking specifically for Aggie engineering talent.</p></div><Tabs tabs={studentTabs} tone="maroon"/></section>
    <section id="recruiters" className="audience recruiters" {...sectionProps("recruiters")}><div className="section-label">For recruiters</div><div className="section-head"><h2>Find engineers<br/>who <em>build.</em></h2><p>Show up in a room filled with technical curiosity, serious preparation, and 12,000+ future colleagues.</p></div><Tabs tabs={recruiterTabs} tone="ink"/></section>
    <section id="dates" className="logistics" {...sectionProps("dates")}><div><p>At a glance</p><h2>Mark the<br/><em>calendar.</em></h2></div><div className="date-grid"><article><span>Sep 8</span><h3>Pre-Fair Events</h3><p>Company Chat + Welcome Social</p></article><article><span>Sep 9–10</span><h3>In-Person Fair</h3><p>9 AM–5 PM · Legends Event Center</p></article><article><span>Sep 11</span><h3>Virtual Fair</h3><p>9 AM–5 PM · HireAggies</p></article></div></section>
    <section id="team" className="team" {...sectionProps("team")}><div className="section-label">Meet the team</div><h2>Students running<br/>the <em>whole show.</em></h2><div className="team-carousel"><div className="team-photo"><Image src={activeMember.photo} fill sizes="(max-width: 760px) 100vw, 55vw" alt={`${activeMember.name}, ${activeMember.role}`}/></div><div className="team-profile"><p className="member-count">{String(member + 1).padStart(2, "0")} / {String(team.length).padStart(2, "0")}</p><h3>{activeMember.name}</h3><p className="member-role">{activeMember.role}</p><p className="member-major">{activeMember.major}</p><div className="carousel-controls"><button onClick={() => setMember((member - 1 + team.length) % team.length)} aria-label="Previous team member"><ChevronLeft/></button><button onClick={() => setMember((member + 1) % team.length)} aria-label="Next team member"><ChevronRight/></button></div></div></div><div className="team-dots" role="tablist" aria-label="Team members">{team.map((person, i) => <button key={person.name} onClick={() => setMember(i)} aria-label={`Show ${person.name}`} aria-selected={i === member}/>)}</div><p className="team-note">And a larger team of Aggie engineers behind every welcome, map, meal, and moment.</p></section>
    <section id="contact" className="contact" {...sectionProps("contact")}><div><p className="section-label">Contact us</p><h2>Let&apos;s make the<br/><em>connection.</em></h2></div><div className="contact-details"><a href="mailto:careerfair@sec.tamu.edu">careerfair@sec.tamu.edu <ArrowUpRight/></a><p>979.847.8567</p><p>125 Spence St.<br/>3127 Texas A&amp;M University<br/>College Station, TX 77843-3127</p><Link href="/admin" className="admin-link">Manage this site <ArrowUpRight/></Link></div></section>
    <footer><div className="footer-logos"><Image src="/images/tamu-logo.png" alt="Texas A&M University" width={500} height={112}/><Image src="/images/sec-logo.png" alt="Student Engineers’ Council" width={774} height={331}/></div><span>© 2026 Student Engineers&apos; Council</span><span>Engineering Career Fair</span></footer>
  </main>;
}
