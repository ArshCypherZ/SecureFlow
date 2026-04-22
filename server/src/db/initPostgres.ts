import type { Pool } from "pg";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('manager','developer')),
  avatar TEXT NOT NULL
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
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  email_alerts BOOLEAN NOT NULL DEFAULT false,
  automatic_scanning BOOLEAN NOT NULL DEFAULT true,
  github_pat TEXT,
  osv_api_key TEXT
);
`;

export async function ensurePostgresSchema(pool: Pool): Promise<void> {
  await pool.query(SCHEMA_SQL);
}

export async function seedPostgresIfEmpty(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ c: string }>(
    "SELECT COUNT(*)::text AS c FROM users"
  );
  if (Number(rows[0]?.c ?? "0") > 0) return;

  await pool.query(`
    INSERT INTO users (id, name, email, role, avatar) VALUES
      ('1', 'Sarah Chen', 'sarah.chen@example.com', 'manager', 'SC'),
      ('2', 'Marcus Rodriguez', 'marcus.r@example.com', 'developer', 'MR'),
      ('3', 'Aisha Patel', 'aisha.patel@example.com', 'developer', 'AP'),
      ('4', 'James Kim', 'james.kim@example.com', 'developer', 'JK')
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO projects (id, name, repository, local_path, scan_status, scan_error, last_scan,
      total_vulnerabilities, critical_count, high_count, medium_count, low_count) VALUES
      ('1', 'E-Commerce Platform', 'github.com/company/ecommerce-platform', NULL, 'ready', NULL,
        '2024-01-25T00:00:00.000Z', 18, 3, 5, 7, 3),
      ('2', 'Mobile API Gateway', 'github.com/company/mobile-api', NULL, 'ready', NULL,
        '2024-01-24T00:00:00.000Z', 12, 1, 4, 5, 2),
      ('3', 'Analytics Dashboard', 'github.com/company/analytics-ui', NULL, 'ready', NULL,
        '2024-01-23T00:00:00.000Z', 8, 0, 2, 4, 2),
      ('4', 'Authentication Service', 'github.com/company/auth-service', NULL, 'ready', NULL,
        '2024-01-20T00:00:00.000Z', 5, 1, 1, 2, 1)
    ON CONFLICT (id) DO NOTHING;
  `);

  const refs = (r: string[]) => JSON.stringify(r);
  const tickets = [
    ["1", "1", "GHSA-c3g4-w6cv-6qjm", "SQL Injection in sequelize ORM", "A critical SQL injection vulnerability exists in Sequelize versions prior to 6.32.1.", "CRITICAL", 9.8, "sequelize", "npm", "6.28.0", "6.32.1", "todo", null, refs(["https://github.com/sequelize/sequelize/security/advisories/GHSA-c3g4-w6cv-6qjm"]), "2024-01-15T00:00:00.000Z", "2024-01-15T00:00:00.000Z"],
    ["2", "1", "GHSA-wf5p-g6vw-rhxx", "Prototype Pollution in lodash", "Lodash versions before 4.17.21 are vulnerable to Prototype Pollution.", "HIGH", 7.5, "lodash", "npm", "4.17.19", "4.17.21", "in-progress", "2", refs(["https://github.com/lodash/lodash/issues/4874"]), "2024-01-10T00:00:00.000Z", "2024-01-20T00:00:00.000Z"],
    ["3", "1", "GHSA-3cvr-822r-rqcc", "Cross-Site Scripting (XSS) in sanitize-html", "sanitize-html versions prior to 2.11.0 fail to properly sanitize certain HTML attributes.", "HIGH", 8.1, "sanitize-html", "npm", "2.7.3", "2.11.0", "in-progress", "3", refs(["https://github.com/apostrophecms/sanitize-html/security/advisories/GHSA-3cvr-822r-rqcc"]), "2024-01-12T00:00:00.000Z", "2024-01-22T00:00:00.000Z"],
    ["4", "1", "GHSA-7fh5-64p2-3v2j", "Path Traversal in express-fileupload", "express-fileupload versions before 1.4.1 are vulnerable to path traversal attacks.", "MEDIUM", 6.5, "express-fileupload", "npm", "1.3.1", "1.4.1", "in-review", "4", "[]", "2024-01-08T00:00:00.000Z", "2024-01-25T00:00:00.000Z"],
    ["5", "1", "GHSA-wxhq-pm8v-cw75", "Denial of Service in json-schema", "json-schema versions prior to 0.4.0 are vulnerable to ReDoS attacks.", "MEDIUM", 5.3, "json-schema", "npm", "0.3.0", "0.4.0", "in-review", "2", "[]", "2024-01-05T00:00:00.000Z", "2024-01-23T00:00:00.000Z"],
    ["6", "1", "GHSA-c2qf-rxjj-qqgw", "Insecure Randomness in uuid", "uuid versions 3.3.2 and below use Math.random() which is not cryptographically secure.", "LOW", 3.7, "uuid", "npm", "3.3.2", "8.3.2", "done", "3", "[]", "2024-01-03T00:00:00.000Z", "2024-01-18T00:00:00.000Z"],
    ["7", "1", "GHSA-p6mc-m468-83gw", "Command Injection in shell-quote", "shell-quote fails to properly escape command arguments.", "CRITICAL", 9.2, "shell-quote", "npm", "1.7.2", "1.8.1", "todo", null, "[]", "2024-01-20T00:00:00.000Z", "2024-01-20T00:00:00.000Z"],
    ["8", "1", "GHSA-pw2r-vq6v-hr8c", "XML External Entity (XXE) in xml2js", "xml2js versions before 0.5.0 are vulnerable to XXE attacks.", "HIGH", 7.8, "xml2js", "npm", "0.4.23", "0.5.0", "todo", null, "[]", "2024-01-18T00:00:00.000Z", "2024-01-18T00:00:00.000Z"],
    ["9", "1", "GHSA-vh95-rmgr-6w4m", "Information Disclosure in axios", "axios versions prior to 1.6.0 may leak sensitive authentication headers.", "MEDIUM", 5.9, "axios", "npm", "1.4.0", "1.6.0", "done", "4", "[]", "2024-01-01T00:00:00.000Z", "2024-01-15T00:00:00.000Z"],
    ["10", "1", "GHSA-6chw-6frg-f759", "Improper Certificate Validation in node-forge", "node-forge versions before 1.3.0 fail to properly validate X.509 certificates.", "LOW", 4.2, "node-forge", "npm", "1.2.1", "1.3.0", "done", "2", "[]", "2023-12-28T00:00:00.000Z", "2024-01-10T00:00:00.000Z"],
  ];

  for (const row of tickets) {
    await pool.query(
      `INSERT INTO tickets (id, project_id, osv_id, summary, description, severity, cvss_score, package, ecosystem,
        current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::timestamptz,$16::timestamptz)
       ON CONFLICT (id) DO NOTHING`,
      row
    );
  }

  await pool.query(`
    INSERT INTO activities (id, kind, message, created_at, meta) VALUES
      ('a1', 'project.scan_completed', 'Scan completed for E-Commerce Platform', NOW(), '{"projectId":"1"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO app_settings (singleton, push_notifications, email_alerts, automatic_scanning, github_pat, osv_api_key)
    VALUES (1, true, false, true, NULL, NULL)
    ON CONFLICT (singleton) DO NOTHING;
  `);

  await pool.query(
    `UPDATE projects SET
      total_vulnerabilities = sub.cnt,
      critical_count = sub.crit,
      high_count = sub.hi,
      medium_count = sub.med,
      low_count = sub.lo
    FROM (
      SELECT project_id,
        COUNT(*)::int AS cnt,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL')::int AS crit,
        COUNT(*) FILTER (WHERE severity = 'HIGH')::int AS hi,
        COUNT(*) FILTER (WHERE severity = 'MEDIUM')::int AS med,
        COUNT(*) FILTER (WHERE severity = 'LOW')::int AS lo
      FROM tickets GROUP BY project_id
    ) sub
    WHERE projects.id = sub.project_id`
  );
}
