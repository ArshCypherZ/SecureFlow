import type { VulnerabilityTicket } from "../types.js";

const OSV_BASE_URL = "https://api.osv.dev/v1";

type OsvSeverity = {
  type?: string;
  score?: string;
};

type OsvAffected = {
  package?: {
    name?: string;
    ecosystem?: string;
  };
  ranges?: Array<{
    events?: Array<{
      introduced?: string;
      fixed?: string;
    }>;
  }>;
};

type OsvReference = {
  url?: string;
};

export type OsvVulnerability = {
  id: string;
  summary?: string;
  details?: string;
  severity?: OsvSeverity[];
  affected?: OsvAffected[];
  references?: OsvReference[];
  database_specific?: {
    severity?: string;
    github_severity?: string;
  };
};

type OsvQueryResponse = {
  vulns?: OsvVulnerability[];
  next_page_token?: string;
};

type OsvBatchQueryItem = {
  version: string;
  package: {
    name: string;
    ecosystem: string;
  };
};

type OsvBatchResponse = {
  results?: Array<{
    vulns?: Array<{
      id?: string;
      modified?: string;
    }>;
    next_page_token?: string;
  }>;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${OSV_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OSV request failed (${response.status}): ${body || response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function queryVulns(
  packageName: string,
  ecosystem: string,
  version: string
): Promise<OsvVulnerability[]> {
  const vulnerabilities: OsvVulnerability[] = [];
  let pageToken: string | undefined;

  do {
    const response = await requestJson<OsvQueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify({
        version,
        package: {
          name: packageName,
          ecosystem,
        },
        ...(pageToken ? { page_token: pageToken } : {}),
      }),
    });
    vulnerabilities.push(...(response.vulns ?? []));
    pageToken = response.next_page_token;
  } while (pageToken);

  return vulnerabilities;
}

export async function batchQuery(queries: OsvBatchQueryItem[]): Promise<OsvBatchResponse> {
  return requestJson<OsvBatchResponse>("/querybatch", {
    method: "POST",
    body: JSON.stringify({ queries }),
  });
}

export async function fetchVuln(osvId: string): Promise<OsvVulnerability> {
  return requestJson<OsvVulnerability>(`/vulns/${encodeURIComponent(osvId)}`);
}

export function parseVuln(
  data: OsvVulnerability,
  packageName: string,
  ecosystem: string,
  version: string
): Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt"> {
  const cvssScore = extractCvssScore(data);
  const references = (data.references ?? [])
    .map((reference) => reference.url)
    .filter((url): url is string => typeof url === "string");

  return {
    source: "scan",
    osvId: data.id,
    summary: data.summary ?? data.id,
    description: data.details ?? "",
    severity: severityFromScore(cvssScore),
    cvssScore,
    package: packageName,
    ecosystem,
    currentVersion: version,
    fixedVersion: extractFixedVersion(data, packageName),
    status: "todo",
    assigneeId: null,
    references,
  };
}

function extractCvssScore(data: OsvVulnerability): number {
  for (const severity of data.severity ?? []) {
    if (!severity.type || !severity.score) continue;
    if (!["CVSS_V3", "CVSS_V4"].includes(severity.type)) continue;

    const direct = Number(severity.score);
    if (Number.isFinite(direct) && direct >= 0 && direct <= 10) {
      return roundScore(direct);
    }

    const matches = severity.score.match(/\/([0-9]+(?:\.[0-9]+)?)\b(?!\/)/g);
    if (matches?.length) {
      const parsed = Number(matches[matches.length - 1]?.slice(1));
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10) {
        return roundScore(parsed);
      }
    }
  }

  const fallbackSeverity =
    data.database_specific?.severity ?? data.database_specific?.github_severity;
  if (fallbackSeverity) {
    const normalized = fallbackSeverity.toUpperCase();
    if (normalized === "CRITICAL") return 9;
    if (normalized === "HIGH") return 7.5;
    if (normalized === "MODERATE" || normalized === "MEDIUM") return 5.5;
    if (normalized === "LOW") return 3.5;
  }

  return 0;
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

function severityFromScore(score: number): VulnerabilityTicket["severity"] {
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

function extractFixedVersion(
  data: OsvVulnerability,
  packageName: string
): string | null {
  for (const affected of data.affected ?? []) {
    if (affected.package?.name && affected.package.name !== packageName) continue;
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) {
        if (event.fixed) return event.fixed;
      }
    }
  }
  return null;
}
