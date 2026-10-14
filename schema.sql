-- CMS persistence model: same database, separate schemas by environment.
create schema if not exists development;
create schema if not exists production;

create table if not exists development.site_config (
  id smallint primary key check (id = 1), config jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists production.site_config (
  id smallint primary key check (id = 1), config jsonb not null, updated_at timestamptz not null default now()
);

-- Future normalized CMS tables. Create these within the intended schema.
create table if not exists site_pages (
  id text primary key,
  slug text not null unique,
  title text not null,
  navigation_label text not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists page_sections (
  id text primary key,
  page_id text not null references site_pages(id) on delete cascade,
  section_type text not null,
  position integer not null,
  visible boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists media_assets (
  id text primary key,
  filename text not null,
  alt_text text,
  storage_url text not null,
  created_at timestamptz not null default now()
);
