// Every editable piece of the public site lives in one SiteContent document.
// Pages are ordered lists of typed blocks; the admin studio edits this
// document directly and the public renderer reads it unchanged.

/** Sanitized HTML produced by the rich-text editor (see lib/sanitize.ts). */
export type RichText = string;
export type ImageRef = { src: string; alt: string };
export type LinkRef = { label: string; href: string };

export type BlockData = {
  hero: {
    eyebrow: string;
    title: string;
    emphasis: string;
    summary: RichText;
    dates: string;
    location: string;
    image: ImageRef;
    primary: LinkRef;
    secondary: LinkRef;
  };
  pageHeader: {
    eyebrow: string;
    title: string;
    intro: RichText;
    /** At-a-glance summary card beside the title (optional). */
    facts: { label: string; value: string }[];
    /** Buttons for the page's top tasks (optional). */
    links: LinkRef[];
  };
  keyDates: {
    heading: string;
    items: { date: string; title: string; meta: string; href: string }[];
  };
  about: {
    heading: string;
    body: RichText;
    stats: { value: string; label: string }[];
  };
  pathways: {
    heading: string;
    intro: RichText;
    items: {
      eyebrow: string;
      title: string;
      body: RichText;
      cta: LinkRef;
      links: LinkRef[];
    }[];
  };
  schedule: {
    heading: string;
    intro: RichText;
    rows: {
      date: string;
      event: string;
      time: string;
      location: string;
      href: string;
    }[];
    note: RichText;
  };
  timeline: {
    heading: string;
    intro: RichText;
    days: {
      title: string;
      meta: string;
      entries: { time: string; title: string; detail: RichText }[];
    }[];
    note: RichText;
  };
  text: { heading: string; body: RichText };
  cards: {
    heading: string;
    intro: RichText;
    items: { title: string; body: RichText; image: ImageRef }[];
    note: RichText;
  };
  event: {
    heading: string;
    body: RichText;
    facts: { label: string; value: string }[];
    links: LinkRef[];
    note: RichText;
    gallery: ImageRef[];
  };
  steps: {
    heading: string;
    intro: RichText;
    steps: { title: string; body: RichText }[];
    links: LinkRef[];
  };
  faq: {
    heading: string;
    intro: RichText;
    groups: { title: string; items: { q: string; a: RichText }[] }[];
  };
  gallery: { heading: string; intro: RichText; images: ImageRef[] };
  table: {
    heading: string;
    intro: RichText;
    columns: string[];
    rows: { cells: string[] }[];
    note: RichText;
  };
  links: {
    heading: string;
    intro: RichText;
    groups: { title: string; links: LinkRef[] }[];
  };
  team: {
    heading: string;
    intro: RichText;
    members: { name: string; role: string; major: string; photo: ImageRef }[];
  };
  contact: {
    heading: string;
    intro: RichText;
    email: string;
    phone: string;
    address: RichText;
    people: { name: string; role: string; phone: string }[];
  };
  callout: { tone: "info" | "warning"; body: RichText };
};

export type BlockType = keyof BlockData;

export type Block<T extends BlockType = BlockType> = {
  [K in T]: {
    id: string;
    type: K;
    visible: boolean;
    /** Label in the page's section navigation; empty hides it from the nav. */
    nav: string;
    /** Optional heading the nav groups this section under (guide pages). */
    group: string;
    /** Visual treatment of the band. */
    tone: "plain" | "tint" | "maroon";
    data: BlockData[K];
  };
}[T];

export type Page = {
  id: string;
  slug: string; // "" for the home page
  title: string;
  description: string;
  layout: "landing" | "guide";
  blocks: Block[];
};

export type SiteSettings = {
  siteName: string;
  nav: LinkRef[];
  headerCta: LinkRef;
  footerNote: string;
  contactEmail: string;
  announcement: RichText;
};

export type SiteContent = {
  version: 3;
  settings: SiteSettings;
  pages: Page[];
};
