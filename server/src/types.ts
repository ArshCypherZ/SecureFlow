/** Domain types aligned with SRS; persistence uses PostgreSQL when DATABASE_URL is set, otherwise in-memory. */

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TicketStatus = "todo" | "in-progress" | "in-review" | "done";
export type UserRole = "manager" | "developer";
export type ScanStatus = "idle" | "queued" | "scanning" | "ready" | "error";

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  avatar: string;
}

export interface VulnerabilityTicket {
  id: string;
  projectId: string;
  source: "scan" | "manual";
  osvId: string;
  summary: string;
  description: string;
  severity: Severity;
  cvssScore: number;
  package: string;
  ecosystem: string;
  currentVersion: string;
  fixedVersion: string | null;
  status: TicketStatus;
  assigneeId: string | null;
  references: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  repository: string;
  localPath: string | null;
  scanStatus: ScanStatus;
  scanError: string | null;
  lastScan: string | null;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface AppSettings {
  githubPat: string | null;
}

export type ActivityKind =
  | "project.created"
  | "project.deleted"
  | "project.scan_started"
  | "project.scan_completed"
  | "project.scan_failed"
  | "ticket.created"
  | "ticket.deleted"
  | "ticket.updated"
  | "ticket.assigned"
  | "user.deleted";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  message: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface WsMessage {
  type: string;
  payload: unknown;
}
