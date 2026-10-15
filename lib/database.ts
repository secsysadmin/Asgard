import { neon } from "@neondatabase/serverless";

export function deploymentSchema() {
  return process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production"
    ? "production"
    : "development";
}

export function hasDatabase() {
  return !!process.env.DATABASE_URL;
}

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

/** DDL for one environment schema. Shared with scripts/migrate.mjs. */
export function schemaStatements(schema: string) {
  return [
    `create schema if not exists ${schema}`,
    `create table if not exists ${schema}.site_content (
      id smallint primary key check (id = 1),
      draft jsonb,
      published jsonb,
      draft_updated_at timestamptz,
      published_at timestamptz
    )`,
    `create table if not exists ${schema}.site_revisions (
      id bigserial primary key,
      content jsonb not null,
      label text not null default '',
      created_at timestamptz not null default now()
    )`,
    `create table if not exists ${schema}.media_files (
      id text primary key,
      filename text not null,
      mime text not null,
      alt text not null default '',
      size integer not null,
      width integer,
      height integer,
      data text not null,
      created_at timestamptz not null default now()
    )`,
  ];
}

let ready: Promise<void> | null = null;

/** Creates the CMS tables on first use so a fresh database just works. */
export function ensureSchema() {
  ready ??= (async () => {
    const sql = database();
    for (const statement of schemaStatements(deploymentSchema())) await sql.query(statement);
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
