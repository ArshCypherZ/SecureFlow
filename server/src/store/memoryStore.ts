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

let users: User[] = [];
let projects: Project[] = [];
let tickets: VulnerabilityTicket[] = [];
let activities: ActivityEvent[] = [];

let settings: AppSettings = {
  githubPat: null,
};

let passwordHashesByUserId: Record<string, string> = {};
let idSeq = 0;

const nextId = () => String(++idSeq);
const nowIso = () => new Date().toISOString();

function recomputeProjectCounts(projectId: string): void {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;

  const list = tickets.filter((ticket) => ticket.projectId === projectId);
  project.totalVulnerabilities = list.length;
  project.criticalCount = list.filter((ticket) => ticket.severity === "CRITICAL").length;
  project.highCount = list.filter((ticket) => ticket.severity === "HIGH").length;
  project.mediumCount = list.filter((ticket) => ticket.severity === "MEDIUM").length;
  project.lowCount = list.filter((ticket) => ticket.severity === "LOW").length;
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

export const memoryStore: AppDataStore = {
  async listUsers() {
    return users.map((user) => ({ ...user }));
  },

  async getUser(id: string) {
    const user = users.find((item) => item.id === id);
    return user ? { ...user } : undefined;
  },

  async getUserByUsername(username: string) {
    const needle = username.trim().toLowerCase();
    const user = users.find((item) => item.username.toLowerCase() === needle);
    return user ? { ...user } : undefined;
  },

  async createUser(input: Omit<User, "id" | "avatar"> & { avatar?: string }) {
    const user: User = {
      id: nextId(),
      name: input.name,
      username: input.username,
      role: input.role,
      avatar: input.avatar ?? initialsFromName(input.name),
    };
    users.push(user);
    return { ...user };
  },

  async deleteUser(id: string) {
    const existing = users.find((item) => item.id === id);
    if (!existing) return undefined;

    users = users.filter((item) => item.id !== id);
    delete passwordHashesByUserId[id];
    tickets = tickets.map((ticket) =>
      ticket.assigneeId === id ? { ...ticket, assigneeId: null, updatedAt: nowIso() } : ticket
    );
    return { ...existing };
  },

  async getUserPasswordHash(userId: string) {
    return passwordHashesByUserId[userId];
  },

  async setUserPasswordHash(userId: string, passwordHash: string) {
    passwordHashesByUserId = {
      ...passwordHashesByUserId,
      [userId]: passwordHash,
    };
  },

  async listProjects() {
    return projects.map((project) => ({ ...project }));
  },

  async getProject(id: string) {
    const project = projects.find((item) => item.id === id);
    return project ? { ...project } : undefined;
  },

  async findProjectByRepository(repo: string) {
    const normalized = normalizeRepo(repo);
    const project = projects.find((item) => normalizeRepo(item.repository) === normalized);
    return project ? { ...project } : undefined;
  },

  async createProject(input: {
    name: string;
    repository: string;
    localPath: string | null;
    scanStatus: ScanStatus;
  }) {
    const project: Project = {
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
    projects.push(project);
    return { ...project };
  },

  async updateProject(id: string, patch: Partial<Project>) {
    const project = projects.find((item) => item.id === id);
    if (!project) return undefined;
    Object.assign(project, patch);
    return { ...project };
  },

  async deleteProject(id: string) {
    const existing = projects.find((item) => item.id === id);
    if (!existing) return undefined;

    projects = projects.filter((item) => item.id !== id);
    tickets = tickets.filter((ticket) => ticket.projectId !== id);
    return { ...existing };
  },

  async listTickets(filters?: {
    projectId?: string;
    assigneeId?: string;
    q?: string;
    severity?: string;
    status?: string;
  }) {
    let list = [...tickets];
    if (filters?.projectId) {
      list = list.filter((ticket) => ticket.projectId === filters.projectId);
    }
    if (filters?.assigneeId) {
      list = list.filter((ticket) => ticket.assigneeId === filters.assigneeId);
    }
    if (filters?.severity && filters.severity !== "all") {
      list = list.filter((ticket) => ticket.severity === filters.severity);
    }
    if (filters?.status) {
      list = list.filter((ticket) => ticket.status === filters.status);
    }
    if (filters?.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter(
        (ticket) =>
          ticket.summary.toLowerCase().includes(q) ||
          ticket.package.toLowerCase().includes(q) ||
          ticket.osvId.toLowerCase().includes(q)
      );
    }
    return list.map((ticket) => ({ ...ticket, references: [...ticket.references] }));
  },

  async getTicket(id: string) {
    const ticket = tickets.find((item) => item.id === id);
    return ticket ? { ...ticket, references: [...ticket.references] } : undefined;
  },

  async createTicket(
    input: Omit<VulnerabilityTicket, "id" | "createdAt" | "updatedAt">
  ) {
    const timestamp = nowIso();
    const ticket: VulnerabilityTicket = {
      ...input,
      id: nextId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    tickets.push(ticket);
    recomputeProjectCounts(ticket.projectId);
    return { ...ticket, references: [...ticket.references] };
  },

  async upsertTicketsForProject(
    projectId: string,
    incoming: Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt">[]
  ) {
    const timestamp = nowIso();
    const incomingIds = new Set(incoming.map((row) => row.osvId));
    tickets = tickets.filter(
      (ticket) =>
        ticket.projectId !== projectId ||
        ticket.source !== "scan" ||
        incomingIds.has(ticket.osvId)
    );

    const synced: VulnerabilityTicket[] = [];
    for (const row of incoming) {
      const existing = tickets.find(
        (ticket) =>
          ticket.projectId === projectId &&
          ticket.osvId === row.osvId &&
          ticket.source === "scan"
      );
      if (existing) {
        Object.assign(existing, {
          ...row,
          updatedAt: timestamp,
        });
        synced.push({ ...existing, references: [...existing.references] });
        continue;
      }

      const ticket: VulnerabilityTicket = {
        ...row,
        id: nextId(),
        projectId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      tickets.push(ticket);
      synced.push({ ...ticket, references: [...ticket.references] });
    }

    recomputeProjectCounts(projectId);
    return synced;
  },

  async updateTicket(
    id: string,
    patch: Partial<Pick<VulnerabilityTicket, "status" | "assigneeId">>
  ) {
    const ticket = tickets.find((item) => item.id === id);
    if (!ticket) return undefined;
    if (patch.status !== undefined) ticket.status = patch.status;
    if (patch.assigneeId !== undefined) ticket.assigneeId = patch.assigneeId;
    ticket.updatedAt = nowIso();
    recomputeProjectCounts(ticket.projectId);
    return { ...ticket, references: [...ticket.references] };
  },

  async deleteTicket(id: string) {
    const existing = tickets.find((item) => item.id === id);
    if (!existing) return undefined;

    tickets = tickets.filter((item) => item.id !== id);
    recomputeProjectCounts(existing.projectId);
    return { ...existing, references: [...existing.references] };
  },

  async deleteTicketsForProject(projectId: string) {
    tickets = tickets.filter((ticket) => ticket.projectId !== projectId);
    recomputeProjectCounts(projectId);
  },

  async pushActivity(event: Omit<ActivityEvent, "id" | "createdAt">) {
    const activity: ActivityEvent = {
      ...event,
      id: `act-${nextId()}`,
      createdAt: nowIso(),
    };
    activities.unshift(activity);
    activities = activities.slice(0, 200);
    return { ...activity, meta: activity.meta ? { ...activity.meta } : undefined };
  },

  async listActivities(limit = 50) {
    return activities.slice(0, limit).map((activity) => ({
      ...activity,
      meta: activity.meta ? { ...activity.meta } : undefined,
    }));
  },

  async getSettings() {
    return { ...settings };
  },

  async updateSettings(patch: Partial<AppSettings>) {
    settings = { ...settings, ...patch };
    return { ...settings };
  },
};
