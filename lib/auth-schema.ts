const AUTH_SCHEMAS = new Set(["development", "production"]);

export function authSchemaStatements(schema: string) {
  if (!AUTH_SCHEMAS.has(schema)) throw new Error("Invalid authentication schema");
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
