import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type {
  ActivityEvent,
  AppSettings,
  Project,
  ScanStatus,
  User,
  VulnerabilityTicket,
} from "../types.js";
import { normalizeRepo } from "./repoNormalize.js";
import type { AppDataStore } from "./storeTypes.js";

type PgUser = {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar: string;
};

type PgProject = {
  id: string;
  name: string;
  repository: string;
  local_path: string | null;
  scan_status: string;
  scan_error: string | null;
  last_scan: Date | null;
  total_vulnerabilities: string;
  critical_count: string;
  high_count: string;
  medium_count: string;
  low_count: string;
};

type PgTicket = {
  id: string;
  project_id: string;
  source: string;
  osv_id: string;
  summary: string;
  description: string;
  severity: string;
  cvss_score: string;
  package: string;
  ecosystem: string;
  current_version: string;
  fixed_version: string | null;
  status: string;
  assignee_id: string | null;
  reference_urls: unknown;
  created_at: Date;
  updated_at: Date;
};

type PgActivity = {
  id: string;
  kind: string;
  message: string;
  created_at: Date;
  meta: unknown;
};

type PgSettings = {
  github_pat: string | null;
};

type PgUserCredential = {
  password_hash: string;
};

type ExistingTicketRow = {
  id: string;
  source: "scan" | "manual";
};

function mapUser(row: PgUser): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role as User["role"],
    avatar: row.avatar,
  };
}

function mapProject(row: PgProject): Project {
  return {
    id: row.id,
    name: row.name,
    repository: row.repository,
    localPath: row.local_path,
    scanStatus: row.scan_status as ScanStatus,
    scanError: row.scan_error,
    lastScan: row.last_scan ? new Date(row.last_scan).toISOString() : null,
    totalVulnerabilities: Number(row.total_vulnerabilities),
    criticalCount: Number(row.critical_count),
    highCount: Number(row.high_count),
    mediumCount: Number(row.medium_count),
    lowCount: Number(row.low_count),
  };
}

function mapTicket(row: PgTicket): VulnerabilityTicket {
  const refs = Array.isArray(row.reference_urls)
    ? (row.reference_urls as string[])
    : typeof row.reference_urls === "string"
      ? (JSON.parse(row.reference_urls) as string[])
      : [];

  return {
    id: row.id,
    projectId: row.project_id,
    source: row.source as VulnerabilityTicket["source"],
    osvId: row.osv_id,
    summary: row.summary,
    description: row.description,
    severity: row.severity as VulnerabilityTicket["severity"],
    cvssScore: Number(row.cvss_score),
    package: row.package,
    ecosystem: row.ecosystem,
    currentVersion: row.current_version,
    fixedVersion: row.fixed_version,
    status: row.status as VulnerabilityTicket["status"],
    assigneeId: row.assignee_id,
    references: refs,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapActivity(row: PgActivity): ActivityEvent {
  return {
    id: row.id,
    kind: row.kind as ActivityEvent["kind"],
    message: row.message,
    createdAt: new Date(row.created_at).toISOString(),
    meta:
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : undefined,
  };
}

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

async function recomputeProjectCounts(
  client: Pool | PoolClient,
  projectId: string
): Promise<void> {
  await client.query(
    `UPDATE projects p SET
      total_vulnerabilities = s.cnt,
      critical_count = s.crit,
      high_count = s.hi,
      medium_count = s.med,
      low_count = s.lo
    FROM (
      SELECT
        COUNT(*)::int AS cnt,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL')::int AS crit,
        COUNT(*) FILTER (WHERE severity = 'HIGH')::int AS hi,
        COUNT(*) FILTER (WHERE severity = 'MEDIUM')::int AS med,
        COUNT(*) FILTER (WHERE severity = 'LOW')::int AS lo
      FROM tickets
      WHERE project_id = $1
    ) s
    WHERE p.id = $1`,
    [projectId]
  );
}

export function createPostgresStore(pool: Pool): AppDataStore {
  async function ensureSettingsRow(): Promise<void> {
    await pool.query(`
      INSERT INTO app_settings (singleton, github_pat)
      VALUES (1, NULL)
      ON CONFLICT (singleton) DO NOTHING
    `);
  }

  async function loadProject(id: string): Promise<Project | undefined> {
    const { rows } = await pool.query<PgProject>(
      `SELECT id, name, repository, local_path, scan_status, scan_error, last_scan,
        total_vulnerabilities::text, critical_count::text, high_count::text, medium_count::text, low_count::text
       FROM projects
       WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapProject(rows[0]) : undefined;
  }

  async function loadTicket(id: string): Promise<VulnerabilityTicket | undefined> {
    const { rows } = await pool.query<PgTicket>(
      `SELECT id, project_id, source, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
        current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at
       FROM tickets
       WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapTicket(rows[0]) : undefined;
  }

  async function loadSettings(): Promise<AppSettings> {
    await ensureSettingsRow();
    const { rows } = await pool.query<PgSettings>(
      `SELECT github_pat
       FROM app_settings
       WHERE singleton = 1`
    );
    const row = rows[0]!;
    return {
      githubPat: row.github_pat,
    };
  }

  return {
    async listUsers() {
      const { rows } = await pool.query<PgUser>(
        "SELECT id, name, username, role, avatar FROM users ORDER BY LOWER(username), id"
      );
      return rows.map(mapUser);
    },

    async getUser(id: string) {
      const { rows } = await pool.query<PgUser>(
        "SELECT id, name, username, role, avatar FROM users WHERE id = $1",
        [id]
      );
      return rows[0] ? mapUser(rows[0]) : undefined;
    },

    async getUserByUsername(username: string) {
      const { rows } = await pool.query<PgUser>(
        "SELECT id, name, username, role, avatar FROM users WHERE LOWER(username) = LOWER($1)",
        [username.trim()]
      );
      return rows[0] ? mapUser(rows[0]) : undefined;
    },

    async createUser(input: Omit<User, "id" | "avatar"> & { avatar?: string }) {
      const id = randomUUID();
      const { rows } = await pool.query<PgUser>(
        `INSERT INTO users (id, name, username, role, avatar)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, username, role, avatar`,
        [id, input.name, input.username, input.role, input.avatar ?? initialsFromName(input.name)]
      );
      return mapUser(rows[0]!);
    },

    async deleteUser(id: string) {
      const { rows } = await pool.query<PgUser>(
        `DELETE FROM users
         WHERE id = $1
         RETURNING id, name, username, role, avatar`,
        [id]
      );
      return rows[0] ? mapUser(rows[0]) : undefined;
    },

    async getUserPasswordHash(userId: string) {
      const { rows } = await pool.query<PgUserCredential>(
        "SELECT password_hash FROM user_credentials WHERE user_id = $1",
        [userId]
      );
      return rows[0]?.password_hash;
    },

    async setUserPasswordHash(userId: string, passwordHash: string) {
      await pool.query(
        `INSERT INTO user_credentials (user_id, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [userId, passwordHash]
      );
    },

    async listProjects() {
      const { rows } = await pool.query<PgProject>(
        `SELECT id, name, repository, local_path, scan_status, scan_error, last_scan,
          total_vulnerabilities::text, critical_count::text, high_count::text, medium_count::text, low_count::text
         FROM projects
         ORDER BY name, id`
      );
      return rows.map(mapProject);
    },

    async getProject(id: string) {
      return loadProject(id);
    },

    async findProjectByRepository(repo: string) {
      const { rows } = await pool.query<PgProject>(
        `SELECT id, name, repository, local_path, scan_status, scan_error, last_scan,
          total_vulnerabilities::text, critical_count::text, high_count::text, medium_count::text, low_count::text
         FROM projects`
      );
      const normalized = normalizeRepo(repo);
      const match = rows.find((row) => normalizeRepo(row.repository) === normalized);
      return match ? mapProject(match) : undefined;
    },

    async createProject(input: {
      name: string;
      repository: string;
      localPath: string | null;
      scanStatus: ScanStatus;
    }) {
      const id = randomUUID();
      const { rows } = await pool.query<PgProject>(
        `INSERT INTO projects (id, name, repository, local_path, scan_status, scan_error, last_scan,
          total_vulnerabilities, critical_count, high_count, medium_count, low_count)
         VALUES ($1, $2, $3, $4, $5, NULL, NULL, 0, 0, 0, 0, 0)
         RETURNING id, name, repository, local_path, scan_status, scan_error, last_scan,
          total_vulnerabilities::text, critical_count::text, high_count::text, medium_count::text, low_count::text`,
        [id, input.name, input.repository, input.localPath, input.scanStatus]
      );
      return mapProject(rows[0]!);
    },

    async updateProject(id: string, patch: Partial<Project>) {
      const current = await loadProject(id);
      if (!current) return undefined;

      const next: Project = { ...current, ...patch };
      const { rows } = await pool.query<PgProject>(
        `UPDATE projects SET
          name = $2,
          repository = $3,
          local_path = $4,
          scan_status = $5,
          scan_error = $6,
          last_scan = $7,
          total_vulnerabilities = $8,
          critical_count = $9,
          high_count = $10,
          medium_count = $11,
          low_count = $12
         WHERE id = $1
         RETURNING id, name, repository, local_path, scan_status, scan_error, last_scan,
          total_vulnerabilities::text, critical_count::text, high_count::text, medium_count::text, low_count::text`,
        [
          id,
          next.name,
          next.repository,
          next.localPath,
          next.scanStatus,
          next.scanError,
          next.lastScan,
          next.totalVulnerabilities,
          next.criticalCount,
          next.highCount,
          next.mediumCount,
          next.lowCount,
        ]
      );
      return rows[0] ? mapProject(rows[0]) : undefined;
    },

    async deleteProject(id: string) {
      const { rows } = await pool.query<PgProject>(
        `DELETE FROM projects
         WHERE id = $1
         RETURNING id, name, repository, local_path, scan_status, scan_error, last_scan,
          total_vulnerabilities::text, critical_count::text, high_count::text, medium_count::text, low_count::text`,
        [id]
      );
      return rows[0] ? mapProject(rows[0]) : undefined;
    },

    async listTickets(filters?: {
      projectId?: string;
      assigneeId?: string;
      q?: string;
      severity?: string;
      status?: string;
    }) {
      const conditions: string[] = [];
      const values: unknown[] = [];
      let index = 1;

      if (filters?.projectId) {
        conditions.push(`project_id = $${index++}`);
        values.push(filters.projectId);
      }
      if (filters?.assigneeId) {
        conditions.push(`assignee_id = $${index++}`);
        values.push(filters.assigneeId);
      }
      if (filters?.severity && filters.severity !== "all") {
        conditions.push(`severity = $${index++}`);
        values.push(filters.severity);
      }
      if (filters?.status) {
        conditions.push(`status = $${index++}`);
        values.push(filters.status);
      }
      if (filters?.q?.trim()) {
        conditions.push(
          `(LOWER(summary) LIKE $${index} OR LOWER(package) LIKE $${index} OR LOWER(osv_id) LIKE $${index})`
        );
        values.push(`%${filters.q.trim().toLowerCase()}%`);
        index += 1;
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const { rows } = await pool.query<PgTicket>(
        `SELECT id, project_id, source, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
          current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at
         FROM tickets
         ${where}
         ORDER BY updated_at DESC, created_at DESC`,
        values
      );
      return rows.map(mapTicket);
    },

    async getTicket(id: string) {
      return loadTicket(id);
    },

    async createTicket(
      input: Omit<VulnerabilityTicket, "id" | "createdAt" | "updatedAt">
    ) {
      const id = randomUUID();
      const timestamp = new Date().toISOString();
      const { rows } = await pool.query<PgTicket>(
        `INSERT INTO tickets (id, project_id, source, osv_id, summary, description, severity, cvss_score, package, ecosystem,
          current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::timestamptz,$17::timestamptz)
         RETURNING id, project_id, source, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
          current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at`,
        [
          id,
          input.projectId,
          input.source,
          input.osvId,
          input.summary,
          input.description,
          input.severity,
          input.cvssScore,
          input.package,
          input.ecosystem,
          input.currentVersion,
          input.fixedVersion,
          input.status,
          input.assigneeId,
          JSON.stringify(input.references ?? []),
          timestamp,
          timestamp,
        ]
      );
      await recomputeProjectCounts(pool, input.projectId);
      return mapTicket(rows[0]!);
    },

    async upsertTicketsForProject(
      projectId: string,
      incoming: Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt">[]
    ) {
      const client = await pool.connect();
      const synced: VulnerabilityTicket[] = [];
      const timestamp = new Date().toISOString();
      const scanIds = incoming
        .filter((row) => row.source === "scan")
        .map((row) => row.osvId);

      try {
        await client.query("BEGIN");

        await client.query(
          `DELETE FROM tickets
           WHERE project_id = $1
             AND source = 'scan'
             AND NOT (osv_id = ANY($2::text[]))`,
          [projectId, scanIds]
        );

        for (const row of incoming) {
          const { rows: existingRows } = await client.query<ExistingTicketRow>(
            "SELECT id, source FROM tickets WHERE project_id = $1 AND osv_id = $2",
            [projectId, row.osvId]
          );
          const existing = existingRows[0];

          if (existing?.source === "manual" && row.source === "scan") {
            continue;
          }

          if (existing) {
            const { rows } = await client.query<PgTicket>(
              `UPDATE tickets SET
                source = $2,
                summary = $3,
                description = $4,
                severity = $5,
                cvss_score = $6,
                package = $7,
                ecosystem = $8,
                current_version = $9,
                fixed_version = $10,
                status = $11,
                assignee_id = $12,
                reference_urls = $13::jsonb,
                updated_at = $14::timestamptz
               WHERE id = $1
               RETURNING id, project_id, source, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
                current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at`,
              [
                existing.id,
                row.source,
                row.summary,
                row.description,
                row.severity,
                row.cvssScore,
                row.package,
                row.ecosystem,
                row.currentVersion,
                row.fixedVersion,
                row.status,
                row.assigneeId,
                JSON.stringify(row.references ?? []),
                timestamp,
              ]
            );
            if (rows[0]) synced.push(mapTicket(rows[0]));
            continue;
          }

          const id = randomUUID();
          const { rows } = await client.query<PgTicket>(
            `INSERT INTO tickets (id, project_id, source, osv_id, summary, description, severity, cvss_score, package, ecosystem,
              current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::timestamptz,$17::timestamptz)
             RETURNING id, project_id, source, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
              current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at`,
            [
              id,
              projectId,
              row.source,
              row.osvId,
              row.summary,
              row.description,
              row.severity,
              row.cvssScore,
              row.package,
              row.ecosystem,
              row.currentVersion,
              row.fixedVersion,
              row.status,
              row.assigneeId,
              JSON.stringify(row.references ?? []),
              timestamp,
              timestamp,
            ]
          );
          if (rows[0]) synced.push(mapTicket(rows[0]));
        }

        await recomputeProjectCounts(client, projectId);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return synced;
    },

    async updateTicket(
      id: string,
      patch: Partial<Pick<VulnerabilityTicket, "status" | "assigneeId">>
    ) {
      const current = await loadTicket(id);
      if (!current) return undefined;

      const { rows } = await pool.query<PgTicket>(
        `UPDATE tickets SET
          status = $2,
          assignee_id = $3,
          updated_at = $4::timestamptz
         WHERE id = $1
         RETURNING id, project_id, source, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
          current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at`,
        [id, patch.status ?? current.status, patch.assigneeId ?? current.assigneeId, new Date().toISOString()]
      );
      await recomputeProjectCounts(pool, current.projectId);
      return rows[0] ? mapTicket(rows[0]) : undefined;
    },

    async deleteTicket(id: string) {
      const { rows } = await pool.query<PgTicket>(
        `DELETE FROM tickets
         WHERE id = $1
         RETURNING id, project_id, source, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
          current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at`,
        [id]
      );
      const deleted = rows[0] ? mapTicket(rows[0]) : undefined;
      if (deleted) {
        await recomputeProjectCounts(pool, deleted.projectId);
      }
      return deleted;
    },

    async deleteTicketsForProject(projectId: string) {
      await pool.query("DELETE FROM tickets WHERE project_id = $1", [projectId]);
      await recomputeProjectCounts(pool, projectId);
    },

    async pushActivity(event: Omit<ActivityEvent, "id" | "createdAt">) {
      const id = `act-${randomUUID()}`;
      const timestamp = new Date().toISOString();
      const { rows } = await pool.query<PgActivity>(
        `INSERT INTO activities (id, kind, message, created_at, meta)
         VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
         RETURNING id, kind, message, created_at, meta`,
        [id, event.kind, event.message, timestamp, JSON.stringify(event.meta ?? null)]
      );
      return mapActivity(rows[0]!);
    },

    async listActivities(limit = 50) {
      const bounded = Math.min(200, Math.max(1, limit));
      const { rows } = await pool.query<PgActivity>(
        `SELECT id, kind, message, created_at, meta
         FROM activities
         ORDER BY created_at DESC
         LIMIT $1`,
        [bounded]
      );
      return rows.map(mapActivity);
    },

    async getSettings() {
      return loadSettings();
    },

    async updateSettings(patch: Partial<AppSettings>) {
      await ensureSettingsRow();
      const current = await loadSettings();
      const next: AppSettings = { ...current, ...patch };

      await pool.query(
        `UPDATE app_settings SET
          github_pat = $1
         WHERE singleton = 1`,
        [next.githubPat]
      );

      return next;
    },
  };
}
