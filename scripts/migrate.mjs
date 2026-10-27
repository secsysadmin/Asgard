import { neon } from "@neondatabase/serverless";

const SCHEMAS = ["development", "production"];

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const sql = neon(url);
for (const schema of SCHEMAS) {
  await sql.query(`create schema if not exists ${schema}`);
  await sql.query(`create table if not exists ${schema}.site_content (id smallint primary key check (id = 1), draft jsonb, published jsonb, draft_updated_at timestamptz, published_at timestamptz)`);
  await sql.query(`create table if not exists ${schema}.site_revisions (id bigserial primary key, content jsonb not null, label text not null default '', created_at timestamptz not null default now())`);
  await sql.query(`create table if not exists ${schema}.media_files (id text primary key, filename text not null, mime text not null, alt text not null default '', size integer not null, width integer, height integer, data text not null, created_at timestamptz not null default now())`);
}
console.log("CMS tables are ready in the development and production schemas.");
