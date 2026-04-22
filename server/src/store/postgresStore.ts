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
  email: string;
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
  push_notifications: boolean;
  email_alerts: boolean;
  automatic_scanning: boolean;
  github_pat: string | null;
  osv_api_key: string | null;
};

function mapUser(r: PgUser): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role as User["role"],
    avatar: r.avatar,
  };
}

function mapProject(r: PgProject): Project {
  return {
    id: r.id,
    name: r.name,
    repository: r.repository,
    localPath: r.local_path,
    scanStatus: r.scan_status as ScanStatus,
    scanError: r.scan_error,
    lastScan: r.last_scan ? new Date(r.last_scan).toISOString() : null,
    totalVulnerabilities: Number(r.total_vulnerabilities),
    criticalCount: Number(r.critical_count),
    highCount: Number(r.high_count),
    mediumCount: Number(r.medium_count),
    lowCount: Number(r.low_count),
  };
}

function mapTicket(r: PgTicket): VulnerabilityTicket {
  const refs = Array.isArray(r.reference_urls)
    ? (r.reference_urls as string[])
    : typeof r.reference_urls === "string"
      ? (JSON.parse(r.reference_urls) as string[])
      : [];
  return {
    id: r.id,
    projectId: r.project_id,
    osvId: r.osv_id,
    summary: r.summary,
    description: r.description,
    severity: r.severity as VulnerabilityTicket["severity"],
    cvssScore: Number(r.cvss_score),
    package: r.package,
    ecosystem: r.ecosystem,
    currentVersion: r.current_version,
    fixedVersion: r.fixed_version,
    status: r.status as VulnerabilityTicket["status"],
    assigneeId: r.assignee_id,
    references: refs,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapActivity(r: PgActivity): ActivityEvent {
  return {
    id: r.id,
    kind: r.kind as ActivityEvent["kind"],
    message: r.message,
    createdAt: new Date(r.created_at).toISOString(),
    meta:
      r.meta && typeof r.meta === "object" && !Array.isArray(r.meta)
        ? (r.meta as Record<string, unknown>)
        : undefined,
  };
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
      INSERT INTO app_settings (singleton, push_notifications, email_alerts, automatic_scanning)
      VALUES (1, true, false, true)
      ON CONFLICT (singleton) DO NOTHING
    `);
  }

  async function loadProject(id: string): Promise<Project | undefined> {
    const { rows } = await pool.query<PgProject>(
      `SELECT id, name, repository, local_path, scan_status, scan_error, last_scan,
        total_vulnerabilities::text, critical_count::text, high_count::text, medium_count::text, low_count::text
       FROM projects WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapProject(rows[0]) : undefined;
  }

  async function loadTicket(id: string): Promise<VulnerabilityTicket | undefined> {
    const { rows } = await pool.query<PgTicket>(
      `SELECT id, project_id, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
        current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at
       FROM tickets WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapTicket(rows[0]) : undefined;
  }

  async function loadSettings(): Promise<AppSettings> {
    await ensureSettingsRow();
    const { rows } = await pool.query<PgSettings>(
      "SELECT push_notifications, email_alerts, automatic_scanning, github_pat, osv_api_key FROM app_settings WHERE singleton = 1"
    );
    const r = rows[0]!;
    return {
      pushNotifications: r.push_notifications,
      emailAlerts: r.email_alerts,
      automaticScanning: r.automatic_scanning,
      githubPat: r.github_pat,
      osvApiKey: r.osv_api_key,
    };
  }

  return {
    async listUsers() {
      const { rows } = await pool.query<PgUser>(
        "SELECT id, name, email, role, avatar FROM users ORDER BY id"
      );
      return rows.map(mapUser);
    },

    async getUser(id: string) {
      const { rows } = await pool.query<PgUser>(
        "SELECT id, name, email, role, avatar FROM users WHERE id = $1",
        [id]
      );
      return rows[0] ? mapUser(rows[0]) : undefined;
    },

    async createUser(input: Omit<User, "id" | "avatar"> & { avatar?: string }) {
      const initials =
        input.avatar ??
        input.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("");
      const id = randomUUID();
      const { rows } = await pool.query<PgUser>(
        `INSERT INTO users (id, name, email, role, avatar)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, avatar`,
        [id, input.name, input.email, input.role, initials || "U"]
      );
      return mapUser(rows[0]!);
    },

    async listProjects() {
      const { rows } = await pool.query<PgProject>(
        `SELECT id, name, repository, local_path, scan_status, scan_error, last_scan,
          total_vulnerabilities::text, critical_count::text, high_count::text, medium_count::text, low_count::text
         FROM projects ORDER BY id`
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
      const n = normalizeRepo(repo);
      const hit = rows.find((r) => normalizeRepo(r.repository) === n);
      return hit ? mapProject(hit) : undefined;
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
      const cur = await loadProject(id);
      if (!cur) return undefined;
      const next: Project = { ...cur, ...patch };
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

    async listTickets(filters?: {
      projectId?: string;
      q?: string;
      severity?: string;
      status?: string;
    }) {
      const cond: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      if (filters?.projectId) {
        cond.push(`project_id = $${i++}`);
        vals.push(filters.projectId);
      }
      if (filters?.severity && filters.severity !== "all") {
        cond.push(`severity = $${i++}`);
        vals.push(filters.severity);
      }
      if (filters?.status) {
        cond.push(`status = $${i++}`);
        vals.push(filters.status);
      }
      if (filters?.q?.trim()) {
        cond.push(
          `(LOWER(summary) LIKE $${i} OR LOWER(package) LIKE $${i} OR LOWER(osv_id) LIKE $${i})`
        );
        vals.push(`%${filters.q.trim().toLowerCase()}%`);
        i++;
      }
      const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
      const { rows } = await pool.query<PgTicket>(
        `SELECT id, project_id, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
          current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at
         FROM tickets ${where} ORDER BY updated_at DESC`,
        vals
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
      const t0 = new Date().toISOString();
      const { rows } = await pool.query<PgTicket>(
        `INSERT INTO tickets (id, project_id, osv_id, summary, description, severity, cvss_score, package, ecosystem,
          current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::timestamptz,$16::timestamptz)
         RETURNING id, project_id, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
          current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at`,
        [
          id,
          input.projectId,
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
          t0,
          t0,
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
      const out: VulnerabilityTicket[] = [];
      const t0 = new Date().toISOString();
      try {
        await client.query("BEGIN");
        for (const row of incoming) {
          const { rows: existing } = await client.query<{ id: string }>(
            "SELECT id FROM tickets WHERE project_id = $1 AND osv_id = $2",
            [projectId, row.osvId]
          );
          if (existing[0]) {
            const { rows } = await client.query<PgTicket>(
              `UPDATE tickets SET
                summary = $2, description = $3, severity = $4, cvss_score = $5, package = $6, ecosystem = $7,
                current_version = $8, fixed_version = $9, status = $10, assignee_id = $11, reference_urls = $12::jsonb,
                updated_at = $13::timestamptz
               WHERE id = $1
               RETURNING id, project_id, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
                current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at`,
              [
                existing[0].id,
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
                t0,
              ]
            );
            if (rows[0]) out.push(mapTicket(rows[0]));
          } else {
            const id = randomUUID();
            const { rows } = await client.query<PgTicket>(
              `INSERT INTO tickets (id, project_id, osv_id, summary, description, severity, cvss_score, package, ecosystem,
                current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::timestamptz,$16::timestamptz)
               RETURNING id, project_id, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
                current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at`,
              [
                id,
                projectId,
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
                t0,
                t0,
              ]
            );
            if (rows[0]) out.push(mapTicket(rows[0]));
          }
        }
        await recomputeProjectCounts(client, projectId);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
      return out;
    },

    async updateTicket(
      id: string,
      patch: Partial<Pick<VulnerabilityTicket, "status" | "assigneeId">>
    ) {
      const cur = await loadTicket(id);
      if (!cur) return undefined;
      const status = patch.status ?? cur.status;
      const assigneeId =
        patch.assigneeId !== undefined ? patch.assigneeId : cur.assigneeId;
      const t0 = new Date().toISOString();
      const { rows } = await pool.query<PgTicket>(
        `UPDATE tickets SET status = $2, assignee_id = $3, updated_at = $4::timestamptz
         WHERE id = $1
         RETURNING id, project_id, osv_id, summary, description, severity, cvss_score::text, package, ecosystem,
          current_version, fixed_version, status, assignee_id, reference_urls, created_at, updated_at`,
        [id, status, assigneeId, t0]
      );
      await recomputeProjectCounts(pool, cur.projectId);
      return rows[0] ? mapTicket(rows[0]) : undefined;
    },

    async deleteTicketsForProject(projectId: string) {
      await pool.query("DELETE FROM tickets WHERE project_id = $1", [projectId]);
      await recomputeProjectCounts(pool, projectId);
    },

    async pushActivity(event: Omit<ActivityEvent, "id" | "createdAt">) {
      const id = `act-${randomUUID()}`;
      const t0 = new Date().toISOString();
      const { rows } = await pool.query<PgActivity>(
        `INSERT INTO activities (id, kind, message, created_at, meta)
         VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
         RETURNING id, kind, message, created_at, meta`,
        [id, event.kind, event.message, t0, JSON.stringify(event.meta ?? null)]
      );
      return mapActivity(rows[0]!);
    },

    async listActivities(limit = 50) {
      const lim = Math.min(200, Math.max(1, limit));
      const { rows } = await pool.query<PgActivity>(
        "SELECT id, kind, message, created_at, meta FROM activities ORDER BY created_at DESC LIMIT $1",
        [lim]
      );
      return rows.map(mapActivity);
    },

    async getSettings() {
      return loadSettings();
    },

    async updateSettings(patch: Partial<AppSettings>) {
      await ensureSettingsRow();
      const cur = await loadSettings();
      const next: AppSettings = { ...cur, ...patch };
      await pool.query(
        `UPDATE app_settings SET
          push_notifications = $1,
          email_alerts = $2,
          automatic_scanning = $3,
          github_pat = $4,
          osv_api_key = $5
         WHERE singleton = 1`,
        [
          next.pushNotifications,
          next.emailAlerts,
          next.automaticScanning,
          next.githubPat,
          next.osvApiKey,
        ]
      );
      return next;
    },
  };
}
