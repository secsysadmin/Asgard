import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const sql = neon(url);
for (const schema of ["development", "production"]) {
  await sql.query(`create schema if not exists ${schema}`);
  await sql.query(`create table if not exists ${schema}.site_config (id smallint primary key check (id = 1), config jsonb not null, updated_at timestamptz not null default now())`);
}
console.log("Created development and production CMS schemas.");
