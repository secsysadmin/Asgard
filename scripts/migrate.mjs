import { DEPLOYMENT_SCHEMAS, schemaStatements } from "../lib/schema.ts";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const sql = neon(url);
for (const schema of DEPLOYMENT_SCHEMAS) {
  for (const statement of schemaStatements(schema)) await sql.query(statement);
}
console.log("CMS tables are ready in the development and production schemas.");
