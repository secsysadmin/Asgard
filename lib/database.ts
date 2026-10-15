import { neon } from "@neondatabase/serverless";

export type SiteConfig = {
  layout: { id: string; visible: boolean }[];
  hero: { headline: string; supporting: string; dates: string; image: string };
  images: Record<string, string>;
};

export const defaultConfig: SiteConfig = {
  layout: [
    "hero",
    "stats",
    "students",
    "recruiters",
    "dates",
    "team",
    "contact",
  ].map((id) => ({ id, visible: true })),
  hero: {
    headline: "SEC Engineering Career Fair",
    supporting: "Where Aggie engineers meet what’s next.",
    dates: "September 9–10, 2026",
    image: "",
  },
  images: {},
};

export function deploymentSchema() {
  return process.env.APP_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
    ? "production"
    : "development";
}

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export function normalizeConfig(input: Partial<SiteConfig>): SiteConfig {
  const known = new Set(defaultConfig.layout.map((section) => section.id));
  const seen = new Set<string>();
  const submitted = Array.isArray(input.layout)
    ? input.layout
        .filter((section): section is { id: string; visible: boolean } => {
          if (!section || !known.has(section.id) || seen.has(section.id))
            return false;
          seen.add(section.id);
          return true;
        })
        .map((section) => ({
          id: section.id,
          visible: section.visible !== false,
        }))
    : [];
  // Preserve the editor's sequence, while inserting newly supported sections
  // beside their intended neighbors for older persisted layouts.
  const layout = [...submitted];
  for (const section of defaultConfig.layout) {
    if (seen.has(section.id)) continue;
    const nextKnown = defaultConfig.layout
      .slice(defaultConfig.layout.indexOf(section) + 1)
      .find((candidate) => seen.has(candidate.id));
    const nextIndex = nextKnown
      ? layout.findIndex((candidate) => candidate.id === nextKnown.id)
      : -1;
    layout.splice(nextIndex === -1 ? layout.length : nextIndex, 0, section);
    seen.add(section.id);
  }
  const legacyOrder = [
    "hero",
    "stats",
    "dates",
    "students",
    "recruiters",
    "team",
    "contact",
  ];
  if (layout.map((section) => section.id).join("|") === legacyOrder.join("|")) {
    const visibility = new Map(
      layout.map((section) => [section.id, section.visible]),
    );
    layout.splice(
      0,
      layout.length,
      ...defaultConfig.layout.map((section) => ({
        ...section,
        visible: visibility.get(section.id) !== false,
      })),
    );
  }
  const hero = input.hero ?? defaultConfig.hero;
  const images =
    input.images && typeof input.images === "object" ? input.images : {};
  return {
    layout,
    hero: {
      headline:
        typeof hero.headline === "string" && hero.headline.trim()
          ? hero.headline.trim()
          : defaultConfig.hero.headline,
      supporting:
        typeof hero.supporting === "string" && hero.supporting.trim()
          ? hero.supporting.trim()
          : defaultConfig.hero.supporting,
      dates:
        typeof hero.dates === "string" && hero.dates.trim()
          ? hero.dates.trim()
          : defaultConfig.hero.dates,
      image: typeof hero.image === "string" ? hero.image : "",
    },
    images: Object.fromEntries(
      Object.entries(images).filter(([, value]) => typeof value === "string"),
    ),
  };
}
