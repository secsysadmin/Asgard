"use client";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  Info,
  type LucideIcon,
  Mail,
  MapPin,
  Monitor,
  Package,
  Phone,
  Shirt,
  Users,
} from "lucide-react";
import { memo, useRef } from "react";
import { faqItemId } from "@/lib/content/anchors";
import type { Block, BlockData, BlockType, LinkRef } from "@/lib/content/types";
import { Img, List, Lnk, MaybeLink, type Path, Rich, Text, useEdit } from "../edit/context";

type Props<K extends BlockType> = { block: Extract<Block, { type: K }>; data: BlockData[K]; at: Path };

/* Shared heading used by most sections. */
function Head({ heading, intro, at }: { heading: string; intro?: string; at: Path }) {
  return (
    <header className="block-head">
      <Text as="h2" value={heading} path={[...at, "heading"]} placeholder="Section heading" />
      {intro !== undefined && <Rich value={intro} path={[...at, "intro"]} className="block-intro" placeholder="Optional introduction" />}
    </header>
  );
}

function Note({ value, at }: { value: string; at: Path }) {
  const edit = useEdit();
  if (!value && !edit) return null;
  return <Rich value={value} path={[...at, "note"]} className="note" placeholder="Optional note (leave empty to hide)" />;
}

function Hero({ data, at }: Props<"hero">) {
  const edit = useEdit();
  return (
    <div className="hero">
      <Img value={data.image} path={[...at, "image"]} className="hero-image" frameClassName="hero-media" loading="eager" />
      <div className="hero-shade" aria-hidden />
      <div className="hero-copy">
        <Text as="p" className="eyebrow light" value={data.eyebrow} path={[...at, "eyebrow"]} placeholder="Eyebrow" />
        <h1>
          <Text value={data.title} path={[...at, "title"]} placeholder="Headline" />
          {(data.emphasis || edit) && (
            <>
              {" "}
              <em>
                <Text value={data.emphasis} path={[...at, "emphasis"]} placeholder="Emphasis" />
              </em>
            </>
          )}
        </h1>
        <Rich value={data.summary} path={[...at, "summary"]} className="hero-summary" placeholder="Supporting sentence" />
        <ul className="hero-meta">
          <li>
            <CalendarDays aria-hidden /> <Text value={data.dates} path={[...at, "dates"]} placeholder="Dates" />
          </li>
          <li>
            <MapPin aria-hidden /> <Text value={data.location} path={[...at, "location"]} placeholder="Location" />
          </li>
        </ul>
        <div className="hero-actions">
          <Lnk className="button button-light" value={data.primary} path={[...at, "primary"]}>
            <ArrowRight aria-hidden />
          </Lnk>
          <Lnk className="button button-outline-light" value={data.secondary} path={[...at, "secondary"]}>
            <ArrowRight aria-hidden />
          </Lnk>
        </div>
      </div>
    </div>
  );
}

// Icons for fact cards, chosen from the label so editors never pick one.
const FACT_ICONS: [RegExp, LucideIcon][] = [
  [/time|hour/i, Clock],
  [/date|when|day/i, CalendarDays],
  [/location|venue|where|place/i, MapPin],
  [/dress|attire|wear/i, Shirt],
  [/regist|rsvp|sign.?up|ticket/i, ClipboardCheck],
  [/platform|virtual|online/i, Monitor],
  [/cost|price|fee|pay/i, CircleDollarSign],
  [/format|who|audience/i, Users],
  [/shuttle|bus|getting there|parking/i, Bus],
  [/ship|deliver|package/i, Package],
];
const factIcon = (label: string) => FACT_ICONS.find(([pattern]) => pattern.test(label))?.[1] ?? Info;


/** The icon card of label/value facts used by event sections and page headers. */
function FactList({ facts, at }: { facts: { label: string; value: string }[]; at: Path }) {
  const edit = useEdit();
  if (!facts.length && !edit) return null;
  return (
    <List
      as="dl"
      className="facts"
      items={facts}
      path={at}
      label="fact"
      render={(fact, _i, p) => {
        const Icon = factIcon(fact.label);
        return (
          <div className="fact">
            <dt>
              <span className="fact-icon" aria-hidden>
                <Icon />
              </span>
              <Text value={fact.label} path={[...p, "label"]} placeholder="Label" />
            </dt>
            <Text as="dd" value={fact.value} path={[...p, "value"]} placeholder="Value" />
          </div>
        );
      }}
    />
  );
}

/** A row of buttons; the first is solid, the rest outlined. */
function Actions({ links, at, className = "actions" }: { links: LinkRef[]; at: Path; className?: string }) {
  const edit = useEdit();
  if (!links.length && !edit) return null;
  return (
    <List
      className={className}
      items={links}
      path={at}
      label="button"
      render={(link, i, p) => {
        // ↗ leaves the site, ↓ jumps within this page, → goes to another page here.
        const Icon = /^(https?:|mailto:|tel:)/i.test(link.href) ? ArrowUpRight : link.href.startsWith("#") ? ArrowDown : ArrowRight;
        return (
          <Lnk className={i === 0 ? "button" : "button button-quiet"} value={link} path={p}>
            <Icon aria-hidden />
          </Lnk>
        );
      }}
    />
  );
}

function PageHeader({ data, at }: Props<"pageHeader">) {
  const edit = useEdit();
  const withCard = data.facts.length > 0 || edit;
  return (
    <div className={withCard ? "page-header page-header-split" : "page-header"}>
      <div className="page-header-main">
        <Text as="p" className="eyebrow" value={data.eyebrow} path={[...at, "eyebrow"]} placeholder="Eyebrow" />
        <Text as="h1" value={data.title} path={[...at, "title"]} placeholder="Page title" />
        <Rich value={data.intro} path={[...at, "intro"]} className="page-intro" placeholder="Introduce this page" />
        <Actions links={data.links} at={[...at, "links"]} className="actions page-header-actions" />
      </div>
      <FactList facts={data.facts} at={[...at, "facts"]} />
    </div>
  );
}

function KeyDates({ data, at }: Props<"keyDates">) {
  return (
    <div className="key-dates">
      <Text as="h2" className="key-dates-heading" value={data.heading} path={[...at, "heading"]} placeholder="Heading" />
      <List
        as="ol"
        className="key-dates-list"
        items={data.items}
        path={[...at, "items"]}
        label="date"
        render={(item, _i, p) => (
          <li>
            <MaybeLink href={item.href} className="key-date">
              <Text className="key-date-when" value={item.date} path={[...p, "date"]} placeholder="Date" />
              <Text className="key-date-title" value={item.title} path={[...p, "title"]} placeholder="What’s happening" />
              <Text className="key-date-meta" value={item.meta} path={[...p, "meta"]} placeholder="Time · place" />
              {item.href && <ArrowRight className="key-date-arrow" aria-hidden />}
            </MaybeLink>
          </li>
        )}
      />
    </div>
  );
}

function About({ data, at }: Props<"about">) {
  return (
    <div className="about">
      <div>
        <Text as="h2" value={data.heading} path={[...at, "heading"]} placeholder="Heading" />
        <Rich value={data.body} path={[...at, "body"]} className="lead" />
      </div>
      <List
        as="dl"
        className="stats"
        items={data.stats}
        path={[...at, "stats"]}
        label="stat"
        render={(stat, _i, p) => (
          <div>
            <Text as="dt" value={stat.value} path={[...p, "value"]} placeholder="100+" />
            <Text as="dd" value={stat.label} path={[...p, "label"]} placeholder="Label" />
          </div>
        )}
      />
    </div>
  );
}

function Pathways({ data, at }: Props<"pathways">) {
  return (
    <>
      <Head heading={data.heading} intro={data.intro} at={at} />
      <List
        className="pathways"
        items={data.items}
        path={[...at, "items"]}
        label="panel"
        render={(item, _i, p) => (
          <article className="pathway">
            <Text as="p" className="eyebrow" value={item.eyebrow} path={[...p, "eyebrow"]} placeholder="Audience" />
            <Text as="h3" value={item.title} path={[...p, "title"]} placeholder="Panel title" />
            <Rich value={item.body} path={[...p, "body"]} />
            <List
              as="ul"
              className="pathway-links"
              items={item.links}
              path={[...p, "links"]}
              label="quick link"
              render={(link, _j, lp) => (
                <li>
                  <Lnk value={link} path={lp}>
                    <ArrowRight aria-hidden />
                  </Lnk>
                </li>
              )}
            />
            <Lnk className="button" value={item.cta} path={[...p, "cta"]}>
              <ArrowRight aria-hidden />
            </Lnk>
          </article>
        )}
      />
    </>
  );
}

function Schedule({ data, at }: Props<"schedule">) {
  return (
    <>
      <Head heading={data.heading} intro={data.intro} at={at} />
      <div className="table-wrap">
        <table className="schedule">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Event</th>
              <th scope="col">Time</th>
              <th scope="col">Location</th>
            </tr>
          </thead>
          <List
            as="tbody"
            items={data.rows}
            path={[...at, "rows"]}
            label="row"
            render={(row, _i, p) => (
              <tr>
                <th scope="row" data-label="Date">
                  <Text value={row.date} path={[...p, "date"]} placeholder="Date" />
                </th>
                <td data-label="Event">
                  <MaybeLink href={row.href} className={row.href ? "text-link" : undefined}>
                    <Text value={row.event} path={[...p, "event"]} placeholder="Event" />
                  </MaybeLink>
                </td>
                <td data-label="Time">
                  <Text value={row.time} path={[...p, "time"]} placeholder="Time" />
                </td>
                <td data-label="Location">
                  <Text value={row.location} path={[...p, "location"]} placeholder="Location" />
                </td>
              </tr>
            )}
          />
        </table>
      </div>
      <Note value={data.note} at={at} />
    </>
  );
}

function Timeline({ data, at }: Props<"timeline">) {
  return (
    <>
      <Head heading={data.heading} intro={data.intro} at={at} />
      <List
        className="timeline"
        items={data.days}
        path={[...at, "days"]}
        label="day"
        render={(day, _i, p) => (
          <section className="timeline-day">
            <header>
              <Text as="h3" value={day.title} path={[...p, "title"]} placeholder="Day" />
              <Text as="p" value={day.meta} path={[...p, "meta"]} placeholder="Date · place" />
            </header>
            <List
              as="ol"
              items={day.entries}
              path={[...p, "entries"]}
              label="entry"
              render={(entry, _j, ep) => (
                <li className="timeline-entry">
                  <Text className="timeline-time" value={entry.time} path={[...ep, "time"]} placeholder="Time" />
                  <div>
                    <Text as="h4" value={entry.title} path={[...ep, "title"]} placeholder="What" />
                    <Rich value={entry.detail} path={[...ep, "detail"]} placeholder="Optional details" />
                  </div>
                </li>
              )}
            />
          </section>
        )}
      />
      <Note value={data.note} at={at} />
    </>
  );
}

function TextBlock({ data, at }: Props<"text">) {
  return (
    <div className="text-block">
      <Text as="h2" value={data.heading} path={[...at, "heading"]} placeholder="Heading" />
      <Rich value={data.body} path={[...at, "body"]} className="prose" />
    </div>
  );
}

function Cards({ data, at }: Props<"cards">) {
  return (
    <>
      <Head heading={data.heading} intro={data.intro} at={at} />
      <List
        className={`cards cards-${data.items.length === 4 ? 2 : Math.min(Math.max(data.items.length, 1), 3)}`}
        items={data.items}
        path={[...at, "items"]}
        label="card"
        render={(item, _i, p) => (
          <article className="card">
            <Img value={item.image} path={[...p, "image"]} frameClassName="card-media" zoom />
            <div className="card-body">
              <Text as="h3" value={item.title} path={[...p, "title"]} placeholder="Card title" />
              <Rich value={item.body} path={[...p, "body"]} />
            </div>
          </article>
        )}
      />
      <Note value={data.note} at={at} />
    </>
  );
}

function Event({ data, at }: Props<"event">) {
  const edit = useEdit();
  return (
    <>
      <div className={data.facts.length > 0 || edit ? "event" : "event event-solo"}>
        <div className="event-main">
          <Text as="h2" value={data.heading} path={[...at, "heading"]} placeholder="Event name" />
          <Rich value={data.body} path={[...at, "body"]} className="lead" />
          <Actions links={data.links} at={[...at, "links"]} />
        </div>
        <FactList facts={data.facts} at={[...at, "facts"]} />
      </div>
      <Note value={data.note} at={at} />
      {(data.gallery.length > 0 || edit) && (
        <List
          className={`photo-strip photo-strip-${Math.min(data.gallery.length, 3)}`}
          items={data.gallery}
          path={[...at, "gallery"]}
          label="photo"
          render={(image, _i, p) => (
            <figure>
              <Img value={image} path={p} zoom />
            </figure>
          )}
        />
      )}
    </>
  );
}

function Steps({ data, at }: Props<"steps">) {
  const edit = useEdit();
  return (
    <>
      <Head heading={data.heading} intro={data.intro} at={at} />
      <List
        as="ol"
        className="steps"
        items={data.steps}
        path={[...at, "steps"]}
        label="step"
        render={(step, _i, p) => (
          <li className="step">
            <div>
              <Text as="h3" value={step.title} path={[...p, "title"]} placeholder="Step title" />
              <Rich value={step.body} path={[...p, "body"]} />
            </div>
          </li>
        )}
      />
      {(data.links.length > 0 || edit) && (
        <List
          className="actions"
          items={data.links}
          path={[...at, "links"]}
          label="button"
          render={(link, i, p) => (
            <Lnk className={i === 0 ? "button" : "button button-quiet"} value={link} path={p}>
              <ArrowUpRight aria-hidden />
            </Lnk>
          )}
        />
      )}
    </>
  );
}

function Faq({ block, data, at }: Props<"faq">) {
  const edit = useEdit();
  return (
    <>
      <Head heading={data.heading} intro={data.intro} at={at} />
      <List
        className="faq-groups"
        items={data.groups}
        path={[...at, "groups"]}
        label="topic"
        render={(group, gi, p) => (
          <section className="faq-group">
            <Text as="h3" className="faq-group-title" value={group.title} path={[...p, "title"]} placeholder="Topic" />
            <List
              className="faq-items"
              items={group.items}
              path={[...p, "items"]}
              label="question"
              render={(item, qi, qp) =>
                edit ? (
                  <div className="faq-item faq-item-open">
                    <Text as="p" className="faq-q" value={item.q} path={[...qp, "q"]} placeholder="Question" />
                    <Rich value={item.a} path={[...qp, "a"]} className="faq-a" placeholder="Answer" />
                  </div>
                ) : (
                  <details className="faq-item" id={faqItemId(block.id, gi, qi)}>
                    <summary>{item.q}</summary>
                    <Rich value={item.a} path={[...qp, "a"]} className="faq-a" />
                  </details>
                )
              }
            />
          </section>
        )}
      />
    </>
  );
}

function Gallery({ data, at }: Props<"gallery">) {
  return (
    <>
      <Head heading={data.heading} intro={data.intro} at={at} />
      <List
        className="gallery"
        items={data.images}
        path={[...at, "images"]}
        label="photo"
        render={(image, _i, p) => (
          <figure>
            <Img value={image} path={p} zoom />
          </figure>
        )}
      />
    </>
  );
}

function Table({ data, at }: Props<"table">) {
  const edit = useEdit();
  return (
    <>
      <Head heading={data.heading} intro={data.intro} at={at} />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {data.columns.map((column, i) => (
                <th scope="col" key={i}>
                  <Text value={column} path={[...at, "columns", i]} placeholder="Column" />
                </th>
              ))}
              {edit && <th className="ed-row-tools" aria-hidden />}
            </tr>
          </thead>
          <List
            as="tbody"
            items={data.rows}
            path={[...at, "rows"]}
            label="row"
            render={(row, _i, p) => (
              <tr>
                {data.columns.map((column, c) => {
                  const Cell = c === 0 ? "th" : "td";
                  return (
                    <Cell key={c} data-label={column} {...(c === 0 ? { scope: "row" } : {})}>
                      <Text value={row.cells[c] ?? ""} path={[...p, "cells", c]} placeholder="—" />
                    </Cell>
                  );
                })}
              </tr>
            )}
          />
        </table>
      </div>
      <Note value={data.note} at={at} />
    </>
  );
}

function Links({ data, at }: Props<"links">) {
  return (
    <>
      <Head heading={data.heading} intro={data.intro} at={at} />
      <List
        className="link-groups"
        items={data.groups}
        path={[...at, "groups"]}
        label="group"
        render={(group, _i, p) => (
          <section className="link-group">
            <Text as="h3" value={group.title} path={[...p, "title"]} placeholder="Group" />
            <List
              as="ul"
              items={group.links}
              path={[...p, "links"]}
              label="link"
              render={(link, _j, lp) => (
                <li>
                  <Lnk value={link} path={lp}>
                    <ArrowUpRight aria-hidden />
                  </Lnk>
                </li>
              )}
            />
          </section>
        )}
      />
    </>
  );
}

function Team({ data, at }: Props<"team">) {
  const edit = useEdit();
  const track = useRef<HTMLDivElement>(null);
  const scroll = (direction: 1 | -1) => {
    const el = track.current?.querySelector(".team-track");
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };
  return (
    <div className="team" ref={track}>
      <div className="team-head">
        <Head heading={data.heading} intro={data.intro} at={at} />
        {!edit && (
          <div className="carousel-controls">
            <button type="button" onClick={() => scroll(-1)} aria-label="Previous team members">
              <ChevronLeft />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Next team members">
              <ChevronRight />
            </button>
          </div>
        )}
      </div>
      <List
        className="team-track"
        containerProps={{ tabIndex: 0, role: "region", "aria-label": `${data.heading}: scroll sideways for more` }}
        items={data.members}
        path={[...at, "members"]}
        label="person"
        render={(member, _i, p) => (
          <article className="member">
            <Img value={member.photo} path={[...p, "photo"]} frameClassName="member-photo" />
            <Text as="h3" value={member.name} path={[...p, "name"]} placeholder="Name" />
            <Text as="p" className="member-role" value={member.role} path={[...p, "role"]} placeholder="Role" />
            <Text as="p" className="member-major" value={member.major} path={[...p, "major"]} placeholder="Major" />
          </article>
        )}
      />
    </div>
  );
}

function Contact({ data, at }: Props<"contact">) {
  const edit = useEdit();
  return (
    <div className="contact">
      <div>
        <Text as="h2" value={data.heading} path={[...at, "heading"]} placeholder="Heading" />
        <Rich value={data.intro} path={[...at, "intro"]} className="lead" />
        {edit ? (
          <p className="contact-email">
            <Mail aria-hidden /> <Text value={data.email} path={[...at, "email"]} placeholder="Email address" />
          </p>
        ) : (
          data.email && (
            <a className="contact-email" href={`mailto:${data.email}`}>
              <Mail aria-hidden /> {data.email}
            </a>
          )
        )}
      </div>
      <div className="contact-grid">
        {(data.people.length > 0 || edit) && (
          <div>
            <h3>Phone</h3>
            <List
              as="ul"
              className="people"
              items={data.people}
              path={[...at, "people"]}
              label="person"
              render={(person, _i, p) => (
                <li>
                  <Text as="strong" value={person.name} path={[...p, "name"]} placeholder="Name" />
                  <Text as="span" value={person.role} path={[...p, "role"]} placeholder="Role" />
                  {edit ? (
                    <Text as="span" className="phone" value={person.phone} path={[...p, "phone"]} placeholder="Phone" />
                  ) : (
                    person.phone && (
                      <a className="phone" href={`tel:${person.phone.replace(/[^\d+]/g, "")}`}>
                        <Phone aria-hidden /> {person.phone}
                      </a>
                    )
                  )}
                </li>
              )}
            />
          </div>
        )}
        <div>
          {(data.phone || edit) && (
            <>
              <h3>Office</h3>
              <Text as="p" value={data.phone} path={[...at, "phone"]} placeholder="Office & phone" />
            </>
          )}
          {(data.address || edit) && (
            <>
              <h3>Mailing address</h3>
              <Rich value={data.address} path={[...at, "address"]} className="address" placeholder="Mailing address" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Callout({ data, at }: Props<"callout">) {
  return (
    <div className={`callout callout-${data.tone}`} role={data.tone === "warning" ? "alert" : "note"}>
      <Rich value={data.body} path={[...at, "body"]} />
    </div>
  );
}

const renderers: { [K in BlockType]: (props: Props<K>) => React.ReactNode } = {
  hero: Hero,
  pageHeader: PageHeader,
  keyDates: KeyDates,
  about: About,
  pathways: Pathways,
  schedule: Schedule,
  timeline: Timeline,
  text: TextBlock,
  cards: Cards,
  event: Event,
  steps: Steps,
  faq: Faq,
  gallery: Gallery,
  table: Table,
  links: Links,
  team: Team,
  contact: Contact,
  callout: Callout,
};

/** Re-renders only when its block or position changes, so typing in one
 *  section of the studio doesn't re-render every other section. */
export const BlockView = memo(
  function BlockView({ block, at }: { block: Block; at: Path }) {
    const Render = renderers[block.type] as (props: Props<BlockType>) => React.ReactNode;
    return <Render block={block as never} data={block.data as never} at={at} />;
  },
  (prev, next) => prev.block === next.block && prev.at.join("/") === next.at.join("/"),
);
