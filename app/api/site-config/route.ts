import { NextResponse } from "next/server";
import { database, defaultConfig, deploymentSchema, normalizeConfig, type SiteConfig } from "@/lib/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sql = database(); const schema = deploymentSchema();
    const rows = await sql.query(`select config from ${schema}.site_config where id = 1`);
    return NextResponse.json(normalizeConfig((rows[0]?.config ?? defaultConfig) as SiteConfig));
  } catch (error) { return NextResponse.json({ error: "Database configuration is unavailable", detail: error instanceof Error ? error.message : "Unknown database error" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  try {
    const config = normalizeConfig(await request.json()); const sql = database(); const schema = deploymentSchema();
    await sql.query(`insert into ${schema}.site_config (id, config) values (1, $1::jsonb) on conflict (id) do update set config = excluded.config, updated_at = now()`, [JSON.stringify(config)]);
    return NextResponse.json(config);
  } catch (error) { return NextResponse.json({ error: "Unable to save site configuration", detail: error instanceof Error ? error.message : "Unknown database error" }, { status: 500 }); }
}
