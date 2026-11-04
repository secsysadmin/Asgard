import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../lib/password.ts';
import { authSchemaStatements, DEPLOYMENT_SCHEMAS } from '../lib/schema.ts';

const MIN_PASSWORD_LENGTH = 12;

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
let input = '';
for await (const chunk of process.stdin) input += chunk;
const { email, password } = JSON.parse(input);
if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || password.length < MIN_PASSWORD_LENGTH) throw new Error(`Valid email and password of at least ${MIN_PASSWORD_LENGTH} characters required`);
const address = email.trim().toLowerCase();
const sql = neon(url);
for (const schema of DEPLOYMENT_SCHEMAS) {
  await sql.query(`create schema if not exists ${schema}`);
  for (const statement of authSchemaStatements(schema)) await sql.query(statement);
  const hash = await hashPassword(password);
  await sql.transaction([
    sql.query(`insert into ${schema}.staff_users (email, password_hash) values ($1, $2) on conflict (email) do update set password_hash = excluded.password_hash`, [address, hash]),
    sql.query(`delete from ${schema}.staff_sessions where email = $1`, [address]),
  ]);
}
console.log('Staff account saved in development and production.');
