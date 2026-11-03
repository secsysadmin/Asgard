import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../lib/password.ts';
import { authSchemaStatements } from '../lib/auth-schema.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
let input = '';
for await (const chunk of process.stdin) input += chunk;
const { email, password } = JSON.parse(input);
if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || password.length < 12) throw new Error('Valid email and password of at least 12 characters required');
const sql = neon(url);
for (const schema of ['development', 'production']) {
  await sql.query(`create schema if not exists ${schema}`);
  for (const statement of authSchemaStatements(schema)) await sql.query(statement);
  const hash = await hashPassword(password);
  await sql.transaction([
    sql.query(`insert into ${schema}.staff_users (email, password_hash) values ($1, $2) on conflict (email) do update set password_hash = excluded.password_hash`, [email.trim().toLowerCase(), hash]),
    sql.query(`delete from ${schema}.staff_sessions where email = $1`, [email.trim().toLowerCase()]),
  ]);
}
console.log('Staff account saved in development and production.');
