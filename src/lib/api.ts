import type { Severity, TicketStatus, UserRole } from "./mockData";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  metrics?: {
    assigned: number;
    inProgress: number;
    completed: number;
  };
}

export interface VulnerabilityTicket {
  id: string;
  projectId: string;
  osvId: string;
  summary: string;
  description: string;
  severity: Severity;
  package: string;
  ecosystem: string;
  currentVersion: string;
  fixedVersion: string | null;
  status: TicketStatus;
  assigneeId: string | null;
  assignee: User | null;
  createdAt: string;
  updatedAt: string;
  cvssScore: number;
  references: string[];
}

export interface Project {
  id: string;
  name: string;
  repository: string;
  scanStatus: "idle" | "queued" | "scanning" | "ready" | "error";
  scanError: string | null;
  lastScan: string | null;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface DashboardSummary {
  totals: {
    vulnerabilities: number;
    open: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byStatus: Record<TicketStatus, number>;
  projects: number;
  scanning: number;
}

export interface Settings {
  pushNotifications: boolean;
  emailAlerts: boolean;
  automaticScanning: boolean;
  githubPatConfigured: boolean;
  osvApiKeyConfigured: boolean;
}

export interface ActivityEvent {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

const managerHeaders = {
  "Content-Type": "application/json",
  "x-secureflow-user-id": "1",
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = await response.text();
  const data = body ? JSON.parse(body) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed: ${response.status}`);
  }
  return data as T;
}

export const api = {
  summary: () => request<DashboardSummary>("/api/dashboard/summary"),
  activity: (limit = 10) => request<ActivityEvent[]>(`/api/activity?limit=${limit}`),
  users: () => request<User[]>("/api/users"),
  projects: () => request<Project[]>("/api/projects"),
  tickets: (params?: { q?: string; severity?: string; status?: string; projectId?: string }) => {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value && value !== "all") query.set(key, value);
    });
    return request<VulnerabilityTicket[]>(`/api/tickets${query.size ? `?${query}` : ""}`);
  },
  createTicket: (payload: {
    projectId: string;
    osvId: string;
    summary: string;
    description: string;
    severity: Severity;
    package: string;
    ecosystem: string;
    currentVersion: string;
    fixedVersion: string | null;
    cvssScore: number;
    assigneeId: string | null;
    status: TicketStatus;
  }) =>
    request<VulnerabilityTicket>("/api/tickets", {
      method: "POST",
      headers: managerHeaders,
      body: JSON.stringify(payload),
    }),
  updateTicket: (id: string, payload: { status?: TicketStatus; assigneeId?: string | null }) =>
    request<VulnerabilityTicket>(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: managerHeaders,
      body: JSON.stringify(payload),
    }),
  createProject: (repositoryUrl: string) =>
    request<Project>("/api/projects", {
      method: "POST",
      headers: managerHeaders,
      body: JSON.stringify({ repositoryUrl }),
    }),
  scanProject: (id: string) =>
    request<{ ok: true; projectId: string; scanStatus: string }>(`/api/projects/${id}/scan`, {
      method: "POST",
      headers: managerHeaders,
    }),
  createUser: (payload: { name: string; email: string; role: UserRole }) =>
    request<User>("/api/users", {
      method: "POST",
      headers: managerHeaders,
      body: JSON.stringify(payload),
    }),
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (payload: Partial<Settings> & { githubPat?: string | null; osvApiKey?: string | null }) =>
    request<Settings>("/api/settings", {
      method: "PUT",
      headers: managerHeaders,
      body: JSON.stringify(payload),
    }),
};

export function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString();
}
