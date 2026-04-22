import type { Pool } from "pg";
import { usernameFromSeed } from "../validation.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('manager','developer')),
  avatar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repository TEXT NOT NULL UNIQUE,
  local_path TEXT,
  scan_status TEXT NOT NULL,
  scan_error TEXT,
  last_scan TIMESTAMPTZ,
  total_vulnerabilities INT NOT NULL DEFAULT 0,
  critical_count INT NOT NULL DEFAULT 0,
  high_count INT NOT NULL DEFAULT 0,
  medium_count INT NOT NULL DEFAULT 0,
  low_count INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'scan' CHECK (source IN ('scan', 'manual')),
  osv_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  cvss_score DOUBLE PRECISION NOT NULL,
  package TEXT NOT NULL,
  ecosystem TEXT NOT NULL,
  current_version TEXT NOT NULL,
  fixed_version TEXT,
  status TEXT NOT NULL,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reference_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(project_id, osv_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  meta JSONB
);

CREATE TABLE IF NOT EXISTS app_settings (
  singleton SMALLINT PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  github_pat TEXT
);
`;

type PgColumn = {
  column_name: string;
};

type PgUserForMigration = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
};

async function listColumns(pool: Pool, tableName: string): Promise<Set<string>> {
  const { rows } = await pool.query<PgColumn>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(rows.map((row) => row.column_name));
}

function dedupeUsername(
  existing: string | null,
  fallback: string | null,
  name: string,
  id: string,
  taken: Set<string>
): string {
  const base = usernameFromSeed(existing, fallback, name, id);
  let candidate = base;
  let suffix = 1;

  while (taken.has(candidate)) {
    const suffixText = `-${suffix++}`;
    const trimmed = base.slice(0, Math.max(3, 32 - suffixText.length));
    candidate = `${trimmed}${suffixText}`;
  }

  taken.add(candidate);
  return candidate;
}

async function migrateUsersTable(pool: Pool): Promise<void> {
  const userColumns = await listColumns(pool, "users");

  if (!userColumns.has("username")) {
    await pool.query("ALTER TABLE users ADD COLUMN username TEXT");
  }

  if (userColumns.has("email")) {
    await pool.query("ALTER TABLE users ALTER COLUMN email DROP NOT NULL");
  }

  const hasEmail = userColumns.has("email");
  const { rows } = await pool.query<PgUserForMigration>(
    hasEmail
      ? "SELECT id, name, username, email FROM users ORDER BY id"
      : "SELECT id, name, username, NULL::text AS email FROM users ORDER BY id"
  );

  const taken = new Set<string>();
  for (const row of rows) {
    const normalized = dedupeUsername(row.username, row.email, row.name, row.id, taken);
    if (row.username === normalized) continue;
    await pool.query("UPDATE users SET username = $2 WHERE id = $1", [row.id, normalized]);
  }

  await pool.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username))"
  );
  await pool.query("ALTER TABLE users ALTER COLUMN username SET NOT NULL");
}

async function migrateTicketsTable(pool: Pool): Promise<void> {
  const ticketColumns = await listColumns(pool, "tickets");
  if (!ticketColumns.has("source")) {
    await pool.query("ALTER TABLE tickets ADD COLUMN source TEXT");
  }

  await pool.query("UPDATE tickets SET source = 'scan' WHERE source IS NULL OR source = ''");
  await pool.query("ALTER TABLE tickets ALTER COLUMN source SET DEFAULT 'scan'");
  await pool.query("ALTER TABLE tickets ALTER COLUMN source SET NOT NULL");
  await pool.query("ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_source_check");
  await pool.query(
    "ALTER TABLE tickets ADD CONSTRAINT tickets_source_check CHECK (source IN ('scan', 'manual'))"
  );
}

async function ensureSettingsRow(pool: Pool): Promise<void> {
  await pool.query(`
    INSERT INTO app_settings (singleton, github_pat)
    VALUES (1, NULL)
    ON CONFLICT (singleton) DO NOTHING
  `);
}

async function migrateSettingsTable(pool: Pool): Promise<void> {
  const settingsColumns = await listColumns(pool, "app_settings");

  if (!settingsColumns.has("github_pat")) {
    await pool.query("ALTER TABLE app_settings ADD COLUMN github_pat TEXT");
  }

  for (const column of [
    "push_notifications",
    "email_alerts",
    "automatic_scanning",
    "osv_api_key",
  ]) {
    if (settingsColumns.has(column)) {
      await pool.query(`ALTER TABLE app_settings DROP COLUMN ${column}`);
    }
  }
}

export async function ensurePostgresSchema(pool: Pool): Promise<void> {
  await pool.query(SCHEMA_SQL);
  await migrateUsersTable(pool);
  await migrateTicketsTable(pool);
  await migrateSettingsTable(pool);
  await ensureSettingsRow(pool);
}

export async function seedPostgresIfEmpty(pool: Pool): Promise<void> {
  await ensureSettingsRow(pool);
}
