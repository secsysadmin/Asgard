import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

const schedule = [
  ["Tue, Sep 8", "Company Chat", "12:00 PM–4:00 PM", "ConocoPhillips Atrium & Virginia Brown Atrium"],
  ["Tue, Sep 8", "Welcome Social", "7:30 PM–9:30 PM", "Zone Club at Kyle Field"],
  ["Wed, Sep 9", "In-Person Career Fair — Day 1", "9:00 AM–5:00 PM", "Legends Event Center"],
  ["Thu, Sep 10", "In-Person Career Fair — Day 2", "9:00 AM–5:00 PM", "Legends Event Center"],
  ["Fri, Sep 11", "Virtual Career Fair", "9:00 AM–5:00 PM", "Symplicity (HireAggies)"]
];

export default function StudentGuide() {
  return <main className="guide-page"><header className="guide-nav"><Link href="/" aria-label="Back to the Engineering Career Fair home page"><Image src="/images/tamu-logo.png" alt="Texas A&M University" width={500} height={112}/><span/><Image src="/images/sec-logo.png" alt="Student Engineers’ Council" width={774} height={331}/></Link><nav><Link href="/student" aria-current="page">Students</Link><Link href="/recruiters">Recruiters</Link><Link href="/">Home</Link></nav></header>
    <section className="guide-hero"><Link href="/" className="back-link"><ArrowLeft/> Back to the fair</Link><p>Students</p><h1>Complete student guide</h1><span>Everything currently published for the 2026 SEC Engineering Career Fair.</span></section>
    <section className="guide-section"><h2>Dates &amp; times</h2><div className="guide-table">{schedule.map(([date, event, time, location]) => <article key={`${date}-${event}`}><time>{date}</time><div><h3>{event}</h3><p>{time}</p></div><p>{location}</p></article>)}</div><p className="guide-note">All current or former Texas A&amp;M University students and TAMU System students may attend the in-person and virtual career fairs.</p></section>
    <section className="guide-section guide-grid"><div><h2>Career fair itinerary</h2><h3>Tuesday — Pre-Fair Events</h3><p>September 8, 2026 · Company Chat runs 12:00 PM–4:00 PM in the ConocoPhillips and Virginia Brown Atriums. The Welcome Social follows from 7:30 PM–9:30 PM at the Zone Club at Kyle Field.</p><h3>Wednesday &amp; Thursday — Exhibition</h3><p>September 9–10, 2026 · 9:00 AM–5:00 PM each day at Legends Event Center.</p></div><div><h2>Dress code</h2><p>Professional attire is required for entry to the in-person fair. Students who do not comply will not be admitted.</p><h3>Career Closet Pop-Up</h3><p>Borrow professional clothing at no cost before the fair: September 2–3, 2026, 10:00 AM–4:00 PM in the ConocoPhillips Atrium.</p></div></section>
    <section className="guide-section guide-grid"><div><h2>Transportation &amp; parking</h2><h3>Free bus shuttle</h3><p>Charter buses run continuously between Wisenbaker Engineering Building (Zachry) and Legends Event Center on September 9–10, every 7–10 minutes, from 7:30 AM–6:30 PM.</p><h3>Student parking</h3><p>Approximately 1,000–1,200 spaces are available at and near Legends Event Center. Staff will direct traffic to open lots at Legends Event Center, D-Bat, TopGolf, Travis Fields, and Schulman’s Movie Bowl Grille. Some D-Bat and TopGolf spaces are reserved.</p></div><div><h2>At the fair</h2><h3>Company search</h3><p>Use the company list, booth assignments, and Legends Event Center floor plan before arriving to plan who you want to meet.</p><h3>Professional headshots</h3><p>Complimentary headshots are available at Legends Event Center’s West End. They are released about 10 days after the fair and remain available through November 16.</p></div></section>
    <section className="guide-section"><h2>Preparation materials</h2><div className="guide-grid"><p>Prepare with the Texas A&amp;M Career Center’s career-fair preparation video, resume tips, dress guide, CV and supporting-document guidance, and YouTube tip videos.</p><p>Bring a current résumé, make a company plan, and allow enough time for shuttle or parking before your first conversation.</p></div></section>
    <footer className="guide-footer"><CalendarDays/> September 9–10, 2026 <MapPin/> Legends Event Center · Bryan, TX <a href="mailto:careerfair@sec.tamu.edu">careerfair@sec.tamu.edu</a></footer>
  </main>;
}
