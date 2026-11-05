import { cache } from "react";
import { database, deploymentSchema, ensureSchema, hasDatabase } from "../database";
import { defaultContent } from "./defaults";
import { normalizeContent } from "./normalize";
import type { SiteContent } from "./types";

type Row = { draft: unknown; published: unknown };

type StudioState = { draft: SiteContent; published: SiteContent };

const MAX_REVISIONS = 30;
const MAX_REVISION_LABEL_LENGTH = 120;

const freshDefaults = () => structuredClone(defaultContent);

async function readRow(): Promise<Row | null> {
  await ensureSchema();
  const rows = (await database().query(
    `select draft, published from ${deploymentSchema()}.site_content where id = 1`,
  )) as Row[];
  return rows[0] ?? null;
}

// Public pages hand all content to the browser, so hidden blocks must be removed here, not just styled away.
function withoutHiddenBlocks(content: SiteContent): SiteContent {
  return { ...content, pages: content.pages.map((page) => ({ ...page, blocks: page.blocks.filter((block) => block.visible) })) };
}

export const getPublishedContent = cache(async (): Promise<SiteContent> => {
  if (!hasDatabase()) return freshDefaults();
  try {
    const row = await readRow();
    return withoutHiddenBlocks(row?.published ? normalizeContent(row.published) : freshDefaults());
  } catch (error) {
    console.error("Falling back to default content:", error);
    return freshDefaults();
  }
});

export async function getStudioState(): Promise<StudioState> {
  const row = await readRow();
  const published = row?.published ? normalizeContent(row.published) : freshDefaults();
  const draft = row?.draft ? normalizeContent(row.draft) : published;
  return { draft, published };
}

export async function saveDraft(input: unknown) {
  await ensureSchema();
  const content = normalizeContent(input);
  await database().query(
    `insert into ${deploymentSchema()}.site_content (id, draft, draft_updated_at) values (1, $1::jsonb, now())
     on conflict (id) do update set draft = excluded.draft, draft_updated_at = now()`,
    [JSON.stringify(content)],
  );
  return { content };
}

export async function publish(input: unknown, label: string) {
  await ensureSchema();
  const content = normalizeContent(input);
  const json = JSON.stringify(content);
  const schema = deploymentSchema();
  const sql = database();
  await sql.transaction([
    sql.query(
      `insert into ${schema}.site_content (id, draft, published, draft_updated_at, published_at)
       values (1, $1::jsonb, $1::jsonb, now(), now())
       on conflict (id) do update set draft = excluded.draft, published = excluded.published,
         draft_updated_at = now(), published_at = now()`,
      [json],
    ),
    sql.query(`insert into ${schema}.site_revisions (content, label) values ($1::jsonb, $2)`, [
      json,
      label.slice(0, MAX_REVISION_LABEL_LENGTH),
    ]),
    sql.query(
      `delete from ${schema}.site_revisions where id not in (select id from ${schema}.site_revisions order by id desc limit ${MAX_REVISIONS})`,
    ),
  ]);
  return { content };
}

export async function listRevisions() {
  await ensureSchema();
  return (await database().query(
    `select id, label, created_at from ${deploymentSchema()}.site_revisions order by id desc limit ${MAX_REVISIONS}`,
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
