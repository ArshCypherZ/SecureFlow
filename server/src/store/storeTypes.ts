import type {
  ActivityEvent,
  AppSettings,
  Project,
  ScanStatus,
  User,
  VulnerabilityTicket,
} from "../types.js";

/** Shared persistence contract (in-memory or PostgreSQL). All methods are async for DB compatibility. */
export type AppDataStore = {
  listUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  createUser(input: Omit<User, "id" | "avatar"> & { avatar?: string }): Promise<User>;
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  findProjectByRepository(repo: string): Promise<Project | undefined>;
  createProject(input: {
    name: string;
    repository: string;
    localPath: string | null;
    scanStatus: ScanStatus;
  }): Promise<Project>;
  updateProject(id: string, patch: Partial<Project>): Promise<Project | undefined>;
  listTickets(filters?: {
    projectId?: string;
    q?: string;
    severity?: string;
    status?: string;
  }): Promise<VulnerabilityTicket[]>;
  getTicket(id: string): Promise<VulnerabilityTicket | undefined>;
  createTicket(
    input: Omit<VulnerabilityTicket, "id" | "createdAt" | "updatedAt">
  ): Promise<VulnerabilityTicket>;
  upsertTicketsForProject(
    projectId: string,
    incoming: Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt">[]
  ): Promise<VulnerabilityTicket[]>;
  updateTicket(
    id: string,
    patch: Partial<Pick<VulnerabilityTicket, "status" | "assigneeId">>
  ): Promise<VulnerabilityTicket | undefined>;
  deleteTicketsForProject(projectId: string): Promise<void>;
  pushActivity(event: Omit<ActivityEvent, "id" | "createdAt">): Promise<ActivityEvent>;
  listActivities(limit?: number): Promise<ActivityEvent[]>;
  getSettings(): Promise<AppSettings>;
  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>;
};
