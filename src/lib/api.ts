const AUTH_TOKEN_STORAGE_KEY = "secureflow-auth-token";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TicketStatus = "todo" | "in-progress" | "in-review" | "done";
export type UserRole = "manager" | "developer";

export interface User {
  id: string;
  name: string;
  username: string;
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
  source: "scan" | "manual";
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
  githubPatConfigured: boolean;
}

export interface ActivityEvent {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface HealthStatus {
  ok: boolean;
  service: string;
  storage: string;
  version: string;
}

export type AuthResponse = {
  token: string;
  user: User;
};

export function getAuthToken(): string | null {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  const hasBody = init?.body !== undefined;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });
  const body = await response.text();
  const data = body ? safeParseJson(body) : null;

  if (!response.ok) {
    throw new Error(
      (data as { message?: string; error?: string } | null)?.message ||
        (data as { message?: string; error?: string } | null)?.error ||
        `Request failed: ${response.status}`
    );
  }

  return data as T;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const api = {
  login: (payload: { username: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  register: (payload: {
    name: string;
    username: string;
    role: UserRole;
    password: string;
  }) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request<{ user: User }>("/api/auth/me"),
  health: () => request<HealthStatus>("/api/health"),
  summary: () => request<DashboardSummary>("/api/dashboard/summary"),
  activity: (limit = 10) => request<ActivityEvent[]>(`/api/activity?limit=${limit}`),
  users: () => request<User[]>("/api/users"),
  projects: () => request<Project[]>("/api/projects"),
  tickets: (params?: {
    q?: string;
    severity?: string;
    status?: string;
    projectId?: string;
    assigneeId?: string;
  }) => {
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
    references?: string[];
  }) =>
    request<VulnerabilityTicket>("/api/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTicket: (id: string, payload: { status?: TicketStatus; assigneeId?: string | null }) =>
    request<VulnerabilityTicket>(`/api/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createProject: (repositoryUrl: string) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ repositoryUrl }),
    }),
  deleteProject: (id: string) =>
    request<{ ok: true; projectId: string }>(`/api/projects/${id}`, {
      method: "DELETE",
    }),
  scanProject: (id: string) =>
    request<{ ok: true; projectId: string; scanStatus: string }>(`/api/projects/${id}/scan`, {
      method: "POST",
    }),
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (payload: { githubPat?: string | null }) =>
    request<Settings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  createUser: (payload: { name: string; username: string; role: UserRole; password?: string }) =>
    request<User & { temporaryPassword?: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteUser: (id: string) =>
    request<{ ok: true; userId: string }>(`/api/users/${id}`, {
      method: "DELETE",
    }),
  deleteTicket: (id: string) =>
    request<{ ok: true; ticketId: string; projectId: string }>(`/api/tickets/${id}`, {
      method: "DELETE",
    }),
};

export function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
