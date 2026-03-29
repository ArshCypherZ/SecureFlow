export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TicketStatus = "todo" | "in-progress" | "in-review" | "done";
export type UserRole = "manager" | "developer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export interface VulnerabilityTicket {
  id: string;
  osvId: string;
  summary: string;
  description: string;
  severity: Severity;
  package: string;
  ecosystem: string;
  currentVersion: string;
  fixedVersion: string | null;
  status: TicketStatus;
  assignedTo: User | null;
  createdAt: Date;
  updatedAt: Date;
  cvssScore: number;
  references: string[];
}

export interface Project {
  id: string;
  name: string;
  repository: string;
  lastScan: Date;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

// Mock users
export const mockUsers: User[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    role: "manager",
    avatar: "SC"
  },
  {
    id: "2",
    name: "Marcus Rodriguez",
    email: "marcus.r@example.com",
    role: "developer",
    avatar: "MR"
  },
  {
    id: "3",
    name: "Aisha Patel",
    email: "aisha.patel@example.com",
    role: "developer",
    avatar: "AP"
  },
  {
    id: "4",
    name: "James Kim",
    email: "james.kim@example.com",
    role: "developer",
    avatar: "JK"
  }
];

// Mock vulnerability tickets
export const mockVulnerabilities: VulnerabilityTicket[] = [
  {
    id: "1",
    osvId: "GHSA-c3g4-w6cv-6qjm",
    summary: "SQL Injection in sequelize ORM",
    description: "A critical SQL injection vulnerability exists in Sequelize versions prior to 6.32.1. Attackers can execute arbitrary SQL commands through improperly sanitized input in the where clause.",
    severity: "CRITICAL",
    package: "sequelize",
    ecosystem: "npm",
    currentVersion: "6.28.0",
    fixedVersion: "6.32.1",
    status: "todo",
    assignedTo: null,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    cvssScore: 9.8,
    references: [
      "https://github.com/sequelize/sequelize/security/advisories/GHSA-c3g4-w6cv-6qjm",
      "https://nvd.nist.gov/vuln/detail/CVE-2024-xxxxx"
    ]
  },
  {
    id: "2",
    osvId: "GHSA-wf5p-g6vw-rhxx",
    summary: "Prototype Pollution in lodash",
    description: "Lodash versions before 4.17.21 are vulnerable to Prototype Pollution via the setWith and set functions. This can lead to application crashes or remote code execution.",
    severity: "HIGH",
    package: "lodash",
    ecosystem: "npm",
    currentVersion: "4.17.19",
    fixedVersion: "4.17.21",
    status: "in-progress",
    assignedTo: mockUsers[1],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-20"),
    cvssScore: 7.5,
    references: [
      "https://github.com/lodash/lodash/issues/4874",
      "https://nvd.nist.gov/vuln/detail/CVE-2021-23337"
    ]
  },
  {
    id: "3",
    osvId: "GHSA-3cvr-822r-rqcc",
    summary: "Cross-Site Scripting (XSS) in sanitize-html",
    description: "sanitize-html versions prior to 2.11.0 fail to properly sanitize certain HTML attributes, allowing attackers to inject malicious scripts.",
    severity: "HIGH",
    package: "sanitize-html",
    ecosystem: "npm",
    currentVersion: "2.7.3",
    fixedVersion: "2.11.0",
    status: "in-progress",
    assignedTo: mockUsers[2],
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-22"),
    cvssScore: 8.1,
    references: [
      "https://github.com/apostrophecms/sanitize-html/security/advisories/GHSA-3cvr-822r-rqcc"
    ]
  },
  {
    id: "4",
    osvId: "GHSA-7fh5-64p2-3v2j",
    summary: "Path Traversal in express-fileupload",
    description: "express-fileupload versions before 1.4.1 are vulnerable to path traversal attacks allowing attackers to write files outside the intended directory.",
    severity: "MEDIUM",
    package: "express-fileupload",
    ecosystem: "npm",
    currentVersion: "1.3.1",
    fixedVersion: "1.4.1",
    status: "in-review",
    assignedTo: mockUsers[3],
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-25"),
    cvssScore: 6.5,
    references: [
      "https://github.com/richardgirges/express-fileupload/issues/xxx"
    ]
  },
  {
    id: "5",
    osvId: "GHSA-wxhq-pm8v-cw75",
    summary: "Denial of Service in json-schema",
    description: "json-schema versions prior to 0.4.0 are vulnerable to ReDoS (Regular Expression Denial of Service) attacks through specially crafted input.",
    severity: "MEDIUM",
    package: "json-schema",
    ecosystem: "npm",
    currentVersion: "0.3.0",
    fixedVersion: "0.4.0",
    status: "in-review",
    assignedTo: mockUsers[1],
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-23"),
    cvssScore: 5.3,
    references: [
      "https://nvd.nist.gov/vuln/detail/CVE-2024-xxxxx"
    ]
  },
  {
    id: "6",
    osvId: "GHSA-c2qf-rxjj-qqgw",
    summary: "Insecure Randomness in uuid",
    description: "uuid versions 3.3.2 and below use Math.random() which is not cryptographically secure for generating UUIDs.",
    severity: "LOW",
    package: "uuid",
    ecosystem: "npm",
    currentVersion: "3.3.2",
    fixedVersion: "8.3.2",
    status: "done",
    assignedTo: mockUsers[2],
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-18"),
    cvssScore: 3.7,
    references: [
      "https://github.com/uuidjs/uuid/issues/xxx"
    ]
  },
  {
    id: "7",
    osvId: "GHSA-p6mc-m468-83gw",
    summary: "Command Injection in shell-quote",
    description: "shell-quote fails to properly escape command arguments, allowing remote code execution through command injection.",
    severity: "CRITICAL",
    package: "shell-quote",
    ecosystem: "npm",
    currentVersion: "1.7.2",
    fixedVersion: "1.8.1",
    status: "todo",
    assignedTo: null,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
    cvssScore: 9.2,
    references: [
      "https://github.com/substack/node-shell-quote/security/advisories/GHSA-p6mc-m468-83gw"
    ]
  },
  {
    id: "8",
    osvId: "GHSA-pw2r-vq6v-hr8c",
    summary: "XML External Entity (XXE) in xml2js",
    description: "xml2js versions before 0.5.0 are vulnerable to XXE attacks allowing attackers to read arbitrary files from the server.",
    severity: "HIGH",
    package: "xml2js",
    ecosystem: "npm",
    currentVersion: "0.4.23",
    fixedVersion: "0.5.0",
    status: "todo",
    assignedTo: null,
    createdAt: new Date("2024-01-18"),
    updatedAt: new Date("2024-01-18"),
    cvssScore: 7.8,
    references: [
      "https://nvd.nist.gov/vuln/detail/CVE-2024-xxxxx"
    ]
  },
  {
    id: "9",
    osvId: "GHSA-vh95-rmgr-6w4m",
    summary: "Information Disclosure in axios",
    description: "axios versions prior to 1.6.0 may leak sensitive authentication headers when following redirects to different domains.",
    severity: "MEDIUM",
    package: "axios",
    ecosystem: "npm",
    currentVersion: "1.4.0",
    fixedVersion: "1.6.0",
    status: "done",
    assignedTo: mockUsers[3],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    cvssScore: 5.9,
    references: [
      "https://github.com/axios/axios/security/advisories/GHSA-vh95-rmgr-6w4m"
    ]
  },
  {
    id: "10",
    osvId: "GHSA-6chw-6frg-f759",
    summary: "Improper Certificate Validation in node-forge",
    description: "node-forge versions before 1.3.0 fail to properly validate X.509 certificates, allowing MITM attacks.",
    severity: "LOW",
    package: "node-forge",
    ecosystem: "npm",
    currentVersion: "1.2.1",
    fixedVersion: "1.3.0",
    status: "done",
    assignedTo: mockUsers[1],
    createdAt: new Date("2023-12-28"),
    updatedAt: new Date("2024-01-10"),
    cvssScore: 4.2,
    references: [
      "https://github.com/digitalbazaar/forge/security/advisories/GHSA-6chw-6frg-f759"
    ]
  }
];

// Mock projects
export const mockProjects: Project[] = [
  {
    id: "1",
    name: "E-Commerce Platform",
    repository: "github.com/company/ecommerce-platform",
    lastScan: new Date("2024-01-25"),
    totalVulnerabilities: 18,
    criticalCount: 3,
    highCount: 5,
    mediumCount: 7,
    lowCount: 3
  },
  {
    id: "2",
    name: "Mobile API Gateway",
    repository: "github.com/company/mobile-api",
    lastScan: new Date("2024-01-24"),
    totalVulnerabilities: 12,
    criticalCount: 1,
    highCount: 4,
    mediumCount: 5,
    lowCount: 2
  },
  {
    id: "3",
    name: "Analytics Dashboard",
    repository: "github.com/company/analytics-ui",
    lastScan: new Date("2024-01-23"),
    totalVulnerabilities: 8,
    criticalCount: 0,
    highCount: 2,
    mediumCount: 4,
    lowCount: 2
  },
  {
    id: "4",
    name: "Authentication Service",
    repository: "github.com/company/auth-service",
    lastScan: new Date("2024-01-20"),
    totalVulnerabilities: 5,
    criticalCount: 1,
    highCount: 1,
    mediumCount: 2,
    lowCount: 1
  }
];

export const getSeverityColor = (severity: Severity): string => {
  switch (severity) {
    case "CRITICAL":
      return "#ef4444";
    case "HIGH":
      return "#f97316";
    case "MEDIUM":
      return "#f59e0b";
    case "LOW":
      return "#10b981";
    default:
      return "#6b7280";
  }
};

export const getStatusLabel = (status: TicketStatus): string => {
  switch (status) {
    case "todo":
      return "To Do";
    case "in-progress":
      return "In Progress";
    case "in-review":
      return "In Review";
    case "done":
      return "Done";
    default:
      return status;
  }
};
