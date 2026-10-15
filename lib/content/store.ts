import { cache } from "react";
import { database, deploymentSchema, ensureSchema, hasDatabase } from "../database";
import { defaultContent } from "./defaults";
import { normalizeContent } from "./normalize";
import type { SiteContent } from "./types";

type Row = {
  draft: unknown;
  published: unknown;
  draft_updated_at: string | null;
  published_at: string | null;
};

async function readRow(): Promise<Row | null> {
  await ensureSchema();
  const rows = (await database().query(
    `select draft, published, draft_updated_at, published_at from ${deploymentSchema()}.site_content where id = 1`,
  )) as Row[];
  return rows[0] ?? null;
}

/** Published content for the public site; never throws. */
export const getPublishedContent = cache(async (): Promise<SiteContent> => {
  if (!hasDatabase()) return structuredClone(defaultContent);
  try {
    const row = await readRow();
    return row?.published ? normalizeContent(row.published) : structuredClone(defaultContent);
  } catch (error) {
    console.error("Falling back to default content:", error);
    return structuredClone(defaultContent);
  }
});

export type StudioState = {
  draft: SiteContent;
  published: SiteContent;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
};

export async function getStudioState(): Promise<StudioState> {
  const row = await readRow();
  const published = row?.published ? normalizeContent(row.published) : structuredClone(defaultContent);
  const draft = row?.draft ? normalizeContent(row.draft) : published;
  return {
    draft,
    published,
    draftUpdatedAt: row?.draft_updated_at ?? null,
    publishedAt: row?.published_at ?? null,
    hasUnpublishedChanges: JSON.stringify(draft) !== JSON.stringify(published),
  };
}

export async function saveDraft(input: unknown) {
  await ensureSchema();
  const content = normalizeContent(input);
  const rows = (await database().query(
    `insert into ${deploymentSchema()}.site_content (id, draft, draft_updated_at) values (1, $1::jsonb, now())
     on conflict (id) do update set draft = excluded.draft, draft_updated_at = now()
     returning draft_updated_at`,
    [JSON.stringify(content)],
  )) as { draft_updated_at: string }[];
  return { content, draftUpdatedAt: rows[0]?.draft_updated_at ?? null };
}

export async function publish(input: unknown, label = "") {
  await ensureSchema();
  const content = normalizeContent(input);
  const json = JSON.stringify(content);
  const schema = deploymentSchema();
  const sql = database();
  // Publish, record the revision, and prune old revisions atomically.
  const [published] = (await sql.transaction([
    sql.query(
      `insert into ${schema}.site_content (id, draft, published, draft_updated_at, published_at)
       values (1, $1::jsonb, $1::jsonb, now(), now())
       on conflict (id) do update set draft = excluded.draft, published = excluded.published,
         draft_updated_at = now(), published_at = now()
       returning published_at`,
      [json],
    ),
    sql.query(`insert into ${schema}.site_revisions (content, label) values ($1::jsonb, $2)`, [json, label.slice(0, 120)]),
    // Keep the 30 most recent revisions.
    sql.query(
      `delete from ${schema}.site_revisions where id not in (select id from ${schema}.site_revisions order by id desc limit 30)`,
    ),
  ])) as { published_at: string }[][];
  return { content, publishedAt: published[0]?.published_at ?? null };
}

export async function listRevisions() {
  await ensureSchema();
  return (await database().query(
    `select id, label, created_at from ${deploymentSchema()}.site_revisions order by id desc limit 30`,
  )) as { id: number; label: string; created_at: string }[];
}

export async function getRevision(id: number) {
  await ensureSchema();
  const rows = (await database().query(
    `select content from ${deploymentSchema()}.site_revisions where id = $1`,
    [id],
  )) as { content: unknown }[];
  return rows[0] ? normalizeContent(rows[0].content) : null;
}
