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

/** In-memory persistence when DATABASE_URL is not set. */

let users: User[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    role: "manager",
    avatar: "SC",
  },
  {
    id: "2",
    name: "Marcus Rodriguez",
    email: "marcus.r@example.com",
    role: "developer",
    avatar: "MR",
  },
  {
    id: "3",
    name: "Aisha Patel",
    email: "aisha.patel@example.com",
    role: "developer",
    avatar: "AP",
  },
  {
    id: "4",
    name: "James Kim",
    email: "james.kim@example.com",
    role: "developer",
    avatar: "JK",
  },
];

let projects: Project[] = [
  {
    id: "1",
    name: "E-Commerce Platform",
    repository: "github.com/company/ecommerce-platform",
    localPath: null,
    scanStatus: "ready",
    scanError: null,
    lastScan: new Date("2024-01-25").toISOString(),
    totalVulnerabilities: 18,
    criticalCount: 3,
    highCount: 5,
    mediumCount: 7,
    lowCount: 3,
  },
  {
    id: "2",
    name: "Mobile API Gateway",
    repository: "github.com/company/mobile-api",
    localPath: null,
    scanStatus: "ready",
    scanError: null,
    lastScan: new Date("2024-01-24").toISOString(),
    totalVulnerabilities: 12,
    criticalCount: 1,
    highCount: 4,
    mediumCount: 5,
    lowCount: 2,
  },
  {
    id: "3",
    name: "Analytics Dashboard",
    repository: "github.com/company/analytics-ui",
    localPath: null,
    scanStatus: "ready",
    scanError: null,
    lastScan: new Date("2024-01-23").toISOString(),
    totalVulnerabilities: 8,
    criticalCount: 0,
    highCount: 2,
    mediumCount: 4,
    lowCount: 2,
  },
  {
    id: "4",
    name: "Authentication Service",
    repository: "github.com/company/auth-service",
    localPath: null,
    scanStatus: "ready",
    scanError: null,
    lastScan: new Date("2024-01-20").toISOString(),
    totalVulnerabilities: 5,
    criticalCount: 1,
    highCount: 1,
    mediumCount: 2,
    lowCount: 1,
  },
];

const nowIso = () => new Date().toISOString();

let tickets: VulnerabilityTicket[] = [
  {
    id: "1",
    projectId: "1",
    osvId: "GHSA-c3g4-w6cv-6qjm",
    summary: "SQL Injection in sequelize ORM",
    description:
      "A critical SQL injection vulnerability exists in Sequelize versions prior to 6.32.1.",
    severity: "CRITICAL",
    package: "sequelize",
    ecosystem: "npm",
    currentVersion: "6.28.0",
    fixedVersion: "6.32.1",
    status: "todo",
    assigneeId: null,
    references: [
      "https://github.com/sequelize/sequelize/security/advisories/GHSA-c3g4-w6cv-6qjm",
    ],
    createdAt: new Date("2024-01-15").toISOString(),
    updatedAt: new Date("2024-01-15").toISOString(),
    cvssScore: 9.8,
  },
  {
    id: "2",
    projectId: "1",
    osvId: "GHSA-wf5p-g6vw-rhxx",
    summary: "Prototype Pollution in lodash",
    description: "Lodash versions before 4.17.21 are vulnerable to Prototype Pollution.",
    severity: "HIGH",
    package: "lodash",
    ecosystem: "npm",
    currentVersion: "4.17.19",
    fixedVersion: "4.17.21",
    status: "in-progress",
    assigneeId: "2",
    references: ["https://github.com/lodash/lodash/issues/4874"],
    createdAt: new Date("2024-01-10").toISOString(),
    updatedAt: new Date("2024-01-20").toISOString(),
    cvssScore: 7.5,
  },
  {
    id: "3",
    projectId: "1",
    osvId: "GHSA-3cvr-822r-rqcc",
    summary: "Cross-Site Scripting (XSS) in sanitize-html",
    description:
      "sanitize-html versions prior to 2.11.0 fail to properly sanitize certain HTML attributes.",
    severity: "HIGH",
    package: "sanitize-html",
    ecosystem: "npm",
    currentVersion: "2.7.3",
    fixedVersion: "2.11.0",
    status: "in-progress",
    assigneeId: "3",
    references: [
      "https://github.com/apostrophecms/sanitize-html/security/advisories/GHSA-3cvr-822r-rqcc",
    ],
    createdAt: new Date("2024-01-12").toISOString(),
    updatedAt: new Date("2024-01-22").toISOString(),
    cvssScore: 8.1,
  },
  {
    id: "4",
    projectId: "1",
    osvId: "GHSA-7fh5-64p2-3v2j",
    summary: "Path Traversal in express-fileupload",
    description: "express-fileupload versions before 1.4.1 are vulnerable to path traversal attacks.",
    severity: "MEDIUM",
    package: "express-fileupload",
    ecosystem: "npm",
    currentVersion: "1.3.1",
    fixedVersion: "1.4.1",
    status: "in-review",
    assigneeId: "4",
    references: [],
    createdAt: new Date("2024-01-08").toISOString(),
    updatedAt: new Date("2024-01-25").toISOString(),
    cvssScore: 6.5,
  },
  {
    id: "5",
    projectId: "1",
    osvId: "GHSA-wxhq-pm8v-cw75",
    summary: "Denial of Service in json-schema",
    description: "json-schema versions prior to 0.4.0 are vulnerable to ReDoS attacks.",
    severity: "MEDIUM",
    package: "json-schema",
    ecosystem: "npm",
    currentVersion: "0.3.0",
    fixedVersion: "0.4.0",
    status: "in-review",
    assigneeId: "2",
    references: [],
    createdAt: new Date("2024-01-05").toISOString(),
    updatedAt: new Date("2024-01-23").toISOString(),
    cvssScore: 5.3,
  },
  {
    id: "6",
    projectId: "1",
    osvId: "GHSA-c2qf-rxjj-qqgw",
    summary: "Insecure Randomness in uuid",
    description: "uuid versions 3.3.2 and below use Math.random() which is not cryptographically secure.",
    severity: "LOW",
    package: "uuid",
    ecosystem: "npm",
    currentVersion: "3.3.2",
    fixedVersion: "8.3.2",
    status: "done",
    assigneeId: "3",
    references: [],
    createdAt: new Date("2024-01-03").toISOString(),
    updatedAt: new Date("2024-01-18").toISOString(),
    cvssScore: 3.7,
  },
  {
    id: "7",
    projectId: "1",
    osvId: "GHSA-p6mc-m468-83gw",
    summary: "Command Injection in shell-quote",
    description: "shell-quote fails to properly escape command arguments.",
    severity: "CRITICAL",
    package: "shell-quote",
    ecosystem: "npm",
    currentVersion: "1.7.2",
    fixedVersion: "1.8.1",
    status: "todo",
    assigneeId: null,
    references: [],
    createdAt: new Date("2024-01-20").toISOString(),
    updatedAt: new Date("2024-01-20").toISOString(),
    cvssScore: 9.2,
  },
  {
    id: "8",
    projectId: "1",
    osvId: "GHSA-pw2r-vq6v-hr8c",
    summary: "XML External Entity (XXE) in xml2js",
    description: "xml2js versions before 0.5.0 are vulnerable to XXE attacks.",
    severity: "HIGH",
    package: "xml2js",
    ecosystem: "npm",
    currentVersion: "0.4.23",
    fixedVersion: "0.5.0",
    status: "todo",
    assigneeId: null,
    references: [],
    createdAt: new Date("2024-01-18").toISOString(),
    updatedAt: new Date("2024-01-18").toISOString(),
    cvssScore: 7.8,
  },
  {
    id: "9",
    projectId: "1",
    osvId: "GHSA-vh95-rmgr-6w4m",
    summary: "Information Disclosure in axios",
    description: "axios versions prior to 1.6.0 may leak sensitive authentication headers.",
    severity: "MEDIUM",
    package: "axios",
    ecosystem: "npm",
    currentVersion: "1.4.0",
    fixedVersion: "1.6.0",
    status: "done",
    assigneeId: "4",
    references: [],
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2024-01-15").toISOString(),
    cvssScore: 5.9,
  },
  {
    id: "10",
    projectId: "1",
    osvId: "GHSA-6chw-6frg-f759",
    summary: "Improper Certificate Validation in node-forge",
    description: "node-forge versions before 1.3.0 fail to properly validate X.509 certificates.",
    severity: "LOW",
    package: "node-forge",
    ecosystem: "npm",
    currentVersion: "1.2.1",
    fixedVersion: "1.3.0",
    status: "done",
    assigneeId: "2",
    references: [],
    createdAt: new Date("2023-12-28").toISOString(),
    updatedAt: new Date("2024-01-10").toISOString(),
    cvssScore: 4.2,
  },
];

let activities: ActivityEvent[] = [
  {
    id: "a1",
    kind: "project.scan_completed",
    message: "Scan completed for E-Commerce Platform",
    createdAt: nowIso(),
    meta: { projectId: "1" },
  },
];

let settings: AppSettings = {
  pushNotifications: true,
  emailAlerts: false,
  automaticScanning: true,
  githubPat: null,
  osvApiKey: null,
};

let idSeq = 100;
const nextId = () => String(++idSeq);

function recomputeProjectCounts(projectId: string): void {
  const list = tickets.filter((t) => t.projectId === projectId);
  const p = projects.find((x) => x.id === projectId);
  if (!p) return;
  p.totalVulnerabilities = list.length;
  p.criticalCount = list.filter((t) => t.severity === "CRITICAL").length;
  p.highCount = list.filter((t) => t.severity === "HIGH").length;
  p.mediumCount = list.filter((t) => t.severity === "MEDIUM").length;
  p.lowCount = list.filter((t) => t.severity === "LOW").length;
}

export const memoryStore: AppDataStore = {
  async listUsers() {
    return [...users];
  },

  async getUser(id: string) {
    return users.find((u) => u.id === id);
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
    const u: User = {
      id: nextId(),
      name: input.name,
      email: input.email,
      role: input.role,
      avatar: initials || "U",
    };
    users.push(u);
    return { ...u };
  },

  async listProjects() {
    return projects.map((p) => ({ ...p }));
  },

  async getProject(id: string) {
    const p = projects.find((x) => x.id === id);
    return p ? { ...p } : undefined;
  },

  async findProjectByRepository(repo: string) {
    const n = normalizeRepo(repo);
    return projects.find((p) => normalizeRepo(p.repository) === n);
  },

  async createProject(input: {
    name: string;
    repository: string;
    localPath: string | null;
    scanStatus: ScanStatus;
  }) {
    const p: Project = {
      id: nextId(),
      name: input.name,
      repository: input.repository,
      localPath: input.localPath,
      scanStatus: input.scanStatus,
      scanError: null,
      lastScan: null,
      totalVulnerabilities: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    };
    projects.push(p);
    return { ...p };
  },

  async updateProject(id: string, patch: Partial<Project>) {
    const p = projects.find((x) => x.id === id);
    if (!p) return undefined;
    Object.assign(p, patch);
    return { ...p };
  },

  async listTickets(filters?: {
    projectId?: string;
    q?: string;
    severity?: string;
    status?: string;
  }) {
    let list = [...tickets];
    if (filters?.projectId) {
      list = list.filter((t) => t.projectId === filters.projectId);
    }
    if (filters?.severity && filters.severity !== "all") {
      list = list.filter((t) => t.severity === filters.severity);
    }
    if (filters?.status) {
      list = list.filter((t) => t.status === filters.status);
    }
    if (filters?.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.summary.toLowerCase().includes(q) ||
          t.package.toLowerCase().includes(q) ||
          t.osvId.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async getTicket(id: string) {
    const t = tickets.find((x) => x.id === id);
    return t ? { ...t } : undefined;
  },

  async createTicket(
    input: Omit<VulnerabilityTicket, "id" | "createdAt" | "updatedAt">
  ) {
    const t0 = nowIso();
    const t: VulnerabilityTicket = {
      ...input,
      id: nextId(),
      createdAt: t0,
      updatedAt: t0,
    };
    tickets.push(t);
    recomputeProjectCounts(t.projectId);
    return { ...t };
  },

  async upsertTicketsForProject(
    projectId: string,
    incoming: Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt">[]
  ) {
    const created: VulnerabilityTicket[] = [];
    const t0 = nowIso();
    for (const row of incoming) {
      const existing = tickets.find(
        (t) => t.projectId === projectId && t.osvId === row.osvId
      );
      if (existing) {
        Object.assign(existing, {
          ...row,
          updatedAt: t0,
        });
        created.push({ ...existing });
      } else {
        const t: VulnerabilityTicket = {
          ...row,
          id: nextId(),
          projectId,
          createdAt: t0,
          updatedAt: t0,
        };
        tickets.push(t);
        created.push({ ...t });
      }
    }
    recomputeProjectCounts(projectId);
    return created;
  },

  async updateTicket(
    id: string,
    patch: Partial<Pick<VulnerabilityTicket, "status" | "assigneeId">>
  ) {
    const t = tickets.find((x) => x.id === id);
    if (!t) return undefined;
    if (patch.status !== undefined) t.status = patch.status;
    if (patch.assigneeId !== undefined) t.assigneeId = patch.assigneeId;
    t.updatedAt = nowIso();
    recomputeProjectCounts(t.projectId);
    return { ...t };
  },

  async deleteTicketsForProject(projectId: string) {
    tickets = tickets.filter((t) => t.projectId !== projectId);
    recomputeProjectCounts(projectId);
  },

  async pushActivity(event: Omit<ActivityEvent, "id" | "createdAt">) {
    const e: ActivityEvent = {
      ...event,
      id: `act-${nextId()}`,
      createdAt: nowIso(),
    };
    activities.unshift(e);
    activities = activities.slice(0, 200);
    return e;
  },

  async listActivities(limit = 50) {
    return activities.slice(0, limit);
  },

  async getSettings() {
    return { ...settings };
  },

  async updateSettings(patch: Partial<AppSettings>) {
    settings = { ...settings, ...patch };
    return { ...settings };
  },
};
