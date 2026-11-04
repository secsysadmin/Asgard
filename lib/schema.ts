export const DEPLOYMENT_SCHEMAS = ["development", "production"];

export function authSchemaStatements(schema: string) {
  if (!DEPLOYMENT_SCHEMAS.includes(schema)) throw new Error("Invalid deployment schema");
  return [
    `create table if not exists ${schema}.staff_users (
      email text primary key,
      password_hash text not null,
      created_at timestamptz not null default now()
    )`,
    `create table if not exists ${schema}.staff_sessions (
      token_hash text primary key,
      email text not null references ${schema}.staff_users(email) on delete cascade,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )`,
    `create index if not exists staff_sessions_expiry on ${schema}.staff_sessions(expires_at)`,
    `create table if not exists ${schema}.staff_login_limits (
      bucket text primary key,
      attempts integer not null,
      reset_at timestamptz not null
    )`,
  ];
}

export function schemaStatements(schema: string) {
  return [
    `create schema if not exists ${schema}`,
    ...authSchemaStatements(schema),
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
