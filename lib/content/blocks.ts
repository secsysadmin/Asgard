import type { Block, BlockData, BlockType, ImageRef } from "./types";

const img = (src = "", alt = ""): ImageRef => ({ src, alt });

type BlockSpec<K extends BlockType> = {
  label: string;
  description: string;
  /** Fields edited with the rich-text editor rather than plain text. */
  starter: () => BlockData[K];
};

// The block library shown in the studio's "Add section" dialog. `starter`
// is the content a freshly inserted section begins with.
export const blockSpecs: { [K in BlockType]: BlockSpec<K> } = {
  hero: {
    label: "Hero banner",
    description: "Full-width photo with headline, dates, and two buttons.",
    starter: () => ({
      eyebrow: "Texas A&M · Student Engineers’ Council",
      title: "New headline",
      emphasis: "",
      summary: "<p>Short supporting sentence.</p>",
      dates: "Date",
      location: "Location",
      image: img("/images/career-fair-hero.webp", "Students at the career fair"),
      primary: { label: "Primary action", href: "/students" },
      secondary: { label: "Secondary action", href: "/recruiters" },
    }),
  },
  pageHeader: {
    label: "Page header",
    description: "Eyebrow, page title, and introduction.",
    starter: () => ({ eyebrow: "Section", title: "Page title", intro: "<p>Introduce this page.</p>" }),
  },
  keyDates: {
    label: "Key dates strip",
    description: "A row of dates that link to more detail.",
    starter: () => ({
      heading: "Key dates",
      items: [{ date: "Sep 1", title: "Event", meta: "Time · Place", href: "" }],
    }),
  },
  about: {
    label: "About + stats",
    description: "Heading and paragraph beside large figures.",
    starter: () => ({
      heading: "About",
      body: "<p>Describe the event.</p>",
      stats: [{ value: "100+", label: "Label" }],
    }),
  },
  pathways: {
    label: "Audience pathways",
    description: "Side-by-side panels that route visitors to the right guide.",
    starter: () => ({
      heading: "Find your guide",
      intro: "",
      items: [
        {
          eyebrow: "Audience",
          title: "Panel title",
          body: "<p>What this audience will find.</p>",
          cta: { label: "Open guide", href: "/" },
          links: [{ label: "Quick link", href: "/" }],
        },
      ],
    }),
  },
  schedule: {
    label: "Schedule table",
    description: "Date, event, time, and location rows.",
    starter: () => ({
      heading: "Dates & times",
      intro: "",
      rows: [{ date: "Day, Mon 1", event: "Event", time: "9:00 AM – 5:00 PM", location: "Location", href: "" }],
      note: "",
    }),
  },
  timeline: {
    label: "Day-by-day itinerary",
    description: "Days with timed entries underneath.",
    starter: () => ({
      heading: "Itinerary",
      intro: "",
      days: [{ title: "Day one", meta: "Date · Place", entries: [{ time: "9:00 AM", title: "Entry", detail: "" }] }],
      note: "",
    }),
  },
  text: {
    label: "Text",
    description: "A heading and formatted paragraphs.",
    starter: () => ({ heading: "Heading", body: "<p>Write something here.</p>" }),
  },
  cards: {
    label: "Cards",
    description: "A grid of topics, each with optional image.",
    starter: () => ({
      heading: "Heading",
      intro: "",
      items: [
        { title: "Card title", body: "<p>Card text.</p>", image: img() },
        { title: "Card title", body: "<p>Card text.</p>", image: img() },
      ],
      note: "",
    }),
  },
  event: {
    label: "Event details",
    description: "Description, fact list, buttons, and a photo strip.",
    starter: () => ({
      heading: "Event name",
      body: "<p>Describe the event.</p>",
      facts: [
        { label: "Date", value: "TBD" },
        { label: "Time", value: "TBD" },
        { label: "Location", value: "TBD" },
      ],
      links: [],
      note: "",
      gallery: [],
    }),
  },
  steps: {
    label: "Numbered steps",
    description: "A how-to sequence with optional buttons.",
    starter: () => ({
      heading: "How it works",
      intro: "",
      steps: [{ title: "First step", body: "<p>Explain the step.</p>" }],
      links: [],
    }),
  },
  faq: {
    label: "FAQ accordion",
    description: "Expandable questions grouped by topic.",
    starter: () => ({
      heading: "Frequently asked questions",
      intro: "",
      groups: [{ title: "General", items: [{ q: "Question?", a: "<p>Answer.</p>" }] }],
    }),
  },
  gallery: {
    label: "Photo gallery",
    description: "A grid of images that open full size.",
    starter: () => ({ heading: "Gallery", intro: "", images: [img()] }),
  },
  table: {
    label: "Table",
    description: "Any rows and columns, such as hotels or policies.",
    starter: () => ({
      heading: "Table",
      intro: "",
      columns: ["Column", "Column"],
      rows: [{ cells: ["", ""] }],
      note: "",
    }),
  },
  links: {
    label: "Resource links",
    description: "Grouped lists of links and downloads.",
    starter: () => ({
      heading: "Resources",
      intro: "",
      groups: [{ title: "Group", links: [{ label: "Link", href: "https://" }] }],
    }),
  },
  team: {
    label: "Team",
    description: "Portrait carousel of people and roles.",
    starter: () => ({
      heading: "Meet the team",
      intro: "",
      members: [{ name: "Name", role: "Role", major: "Major", photo: img() }],
    }),
  },
  contact: {
    label: "Contact",
    description: "Email, phone numbers, and mailing address.",
    starter: () => ({
      heading: "Contact us",
      intro: "",
      email: "careerfair@sec.tamu.edu",
      phone: "",
      address: "",
      people: [],
    }),
  },
  callout: {
    label: "Callout",
    description: "A highlighted note or warning.",
    starter: () => ({ tone: "info", body: "<p>Important note.</p>" }),
  },
};

/** Keys whose string values are rich HTML. Everything else is plain text. */
export const richKeys = new Set(["summary", "intro", "body", "note", "detail", "a", "address", "announcement"]);

export const blockTypes = Object.keys(blockSpecs) as BlockType[];

export function newBlockId(type: string) {
  return `${type}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlock(type: BlockType): Block {
  return {
    id: newBlockId(type),
    type,
    visible: true,
    nav: "",
    group: "",
    tone: "plain",
    data: blockSpecs[type].starter(),
  } as Block;
}

/** An empty value shaped like `sample`, used when adding list items. */
export function blankLike<T>(sample: T): T {
  if (typeof sample === "string") return "" as T;
  if (typeof sample === "number") return 0 as T;
  if (typeof sample === "boolean") return sample;
  if (Array.isArray(sample)) return [] as T;
  if (sample && typeof sample === "object") {
    return Object.fromEntries(
      Object.entries(sample).map(([key, value]) => [
        key,
        // Keep one blank table cell per column so new rows line up.
        key === "cells" && Array.isArray(value) ? value.map(() => "") : blankLike(value),
      ]),
    ) as T;
  }
  return sample;
}
