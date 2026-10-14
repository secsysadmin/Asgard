import { neon } from "@neondatabase/serverless";

export type SiteConfig = {
  layout: { id: string; visible: boolean }[];
  hero: { headline: string; supporting: string; dates: string; image: string };
};

export const defaultConfig: SiteConfig = {
  layout: ["hero", "dates", "students", "recruiters", "team", "contact"].map(id => ({ id, visible: true })),
  hero: { headline: "SEC Engineering Career Fair", supporting: "Where Aggie engineers meet what’s next.", dates: "September 9–10, 2026", image: "" }
};

export function deploymentSchema() {
  return process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production" ? "production" : "development";
}

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export function normalizeConfig(input: Partial<SiteConfig>): SiteConfig {
  const known = new Set(defaultConfig.layout.map(section => section.id));
  const seen = new Set<string>();
  const submitted = Array.isArray(input.layout)
    ? input.layout.filter((section): section is { id: string; visible: boolean } => {
      if (!section || !known.has(section.id) || seen.has(section.id)) return false;
      seen.add(section.id);
      return true;
    }).map(section => ({ id: section.id, visible: section.visible !== false }))
    : [];
  // Preserve the editor's sequence, while ensuring a partial or older client
  // cannot make a supported section disappear from the persisted configuration.
  const layout = [...submitted, ...defaultConfig.layout.filter(section => !seen.has(section.id))];
  const hero = input.hero ?? defaultConfig.hero;
  return {
    layout,
    hero: {
      headline: typeof hero.headline === "string" && hero.headline.trim() ? hero.headline.trim() : defaultConfig.hero.headline,
      supporting: typeof hero.supporting === "string" && hero.supporting.trim() ? hero.supporting.trim() : defaultConfig.hero.supporting,
      dates: typeof hero.dates === "string" && hero.dates.trim() ? hero.dates.trim() : defaultConfig.hero.dates,
      image: typeof hero.image === "string" ? hero.image : ""
    }
  };
}
