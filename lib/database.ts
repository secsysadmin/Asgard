import { neon } from "@neondatabase/serverless";
import { schemaStatements } from "./schema";

let ready: Promise<void> | null = null;

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

async function createTablesInOneRoundTrip() {
  const sql = database();
  await sql.transaction(schemaStatements(deploymentSchema()).map((statement) => sql.query(statement)));
}

export function ensureSchema() {
  ready ??= createTablesInOneRoundTrip().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
