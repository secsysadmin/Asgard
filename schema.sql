-- CMS persistence model: one database, one schema per environment.
-- Repeat for `production`. The app creates these automatically on first use
-- (lib/database.ts), and `npm run db:migrate` creates both schemas up front.
create schema if not exists development;

-- The whole site (pages, sections, settings) as one validated JSON document.
-- `draft` is what the studio autosaves; `published` is what visitors see.
create table if not exists development.site_content (
  id smallint primary key check (id = 1),
  draft jsonb,
  published jsonb,
  draft_updated_at timestamptz,
  published_at timestamptz
);

-- A snapshot of every publish (latest 30 kept) for the studio's History panel.
create table if not exists development.site_revisions (
  id bigserial primary key,
  content jsonb not null,
  label text not null default '',
  created_at timestamptz not null default now()
);

-- Uploaded images and PDFs, served from /api/media/<id>.
create table if not exists development.media_files (
  id text primary key,
  filename text not null,
  mime text not null,
  alt text not null default '',
  size integer not null,
  width integer,
  height integer,
  data text not null, -- base64
  created_at timestamptz not null default now()
);

create table if not exists development.staff_users (
  email text primary key,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists development.staff_sessions (
  token_hash text primary key,
  email text not null references development.staff_users(email) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists staff_sessions_expiry on development.staff_sessions(expires_at);

create table if not exists development.staff_login_limits (
  bucket text primary key,
  attempts integer not null,
  reset_at timestamptz not null
);
