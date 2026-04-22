import type { Severity, VulnerabilityTicket } from "../types.js";

type OsvPackage = {
  package?: { name?: string; version?: string; ecosystem?: string };
  vulnerabilities?: Record<string, unknown>[];
};

type OsvScannerJson = {
  results?: Array<{
    packages?: OsvPackage[];
  }>;
};

export function parseOsvScannerJson(
  jsonText: string,
  _projectId: string
): Omit<
  VulnerabilityTicket,
  "id" | "projectId" | "createdAt" | "updatedAt"
>[] {
  let parsed: OsvScannerJson;
  try {
    parsed = JSON.parse(jsonText) as OsvScannerJson;
  } catch {
    return [];
  }
  const out: Omit<
    VulnerabilityTicket,
    "id" | "projectId" | "createdAt" | "updatedAt"
  >[] = [];
  const seen = new Set<string>();

  for (const block of parsed.results ?? []) {
    for (const pkg of block.packages ?? []) {
      const name = pkg.package?.name ?? "unknown";
      const version = pkg.package?.version ?? "0";
      const ecosystem = pkg.package?.ecosystem ?? "npm";
      for (const vuln of pkg.vulnerabilities ?? []) {
        const id = String(vuln.id ?? "");
        if (!id) continue;
        const key = `${id}@${name}@${ecosystem}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const cvssScore = extractCvssScore(vuln);
        const severity = severityFromScore(cvssScore);
        const fixedVersion = extractFixedVersion(vuln, name);
        const references = extractReferences(vuln);

        out.push({
          osvId: id,
          summary: String(vuln.summary ?? vuln.id ?? "Vulnerability"),
          description: String(vuln.details ?? vuln.summary ?? ""),
          severity,
          cvssScore,
          package: name,
          ecosystem,
          currentVersion: version,
          fixedVersion,
          status: "todo",
          assigneeId: null,
          references,
        });
      }
    }
  }
  return out;
}

function extractCvssScore(vuln: Record<string, unknown>): number {
  const severities = vuln.severity as Array<{ type?: string; score?: string }> | undefined;
  if (Array.isArray(severities)) {
    for (const s of severities) {
      const raw = s?.score;
      if (typeof raw === "string") {
        const direct = parseFloat(raw);
        if (!Number.isNaN(direct) && direct >= 0 && direct <= 10) {
          return roundScore(direct);
        }
        const m = raw.match(/\/([0-9]+(?:\.[0-9]+)?)\b(?!\/)/g);
        if (m?.length) {
          const last = parseFloat(m[m.length - 1].slice(1));
          if (!Number.isNaN(last) && last >= 0 && last <= 10) return roundScore(last);
        }
      }
    }
  }
  const gh =
    (vuln.database_specific as { severity?: string } | undefined)?.severity ??
    (vuln.database_specific as { github_severity?: string } | undefined)
      ?.github_severity;
  if (typeof gh === "string") {
    const map: Record<string, number> = {
      CRITICAL: 9.0,
      HIGH: 7.5,
      MODERATE: 5.5,
      MEDIUM: 5.5,
      LOW: 3.5,
    };
    const v = map[gh.toUpperCase()];
    if (v !== undefined) return v;
  }
  return 5.0;
}

function roundScore(n: number): number {
  return Math.round(n * 10) / 10;
}

function severityFromScore(score: number): Severity {
  if (score >= 9.0) return "CRITICAL";
  if (score >= 7.0) return "HIGH";
  if (score >= 4.0) return "MEDIUM";
  return "LOW";
}

function extractFixedVersion(
  vuln: Record<string, unknown>,
  packageName: string
): string | null {
  const affected = vuln.affected as
    | Array<{
        package?: { name?: string };
        ranges?: Array<{ events?: Array<{ fixed?: string; introduced?: string }> }>;
      }>
    | undefined;
  if (!Array.isArray(affected)) return null;
  for (const aff of affected) {
    if (aff.package?.name && aff.package.name !== packageName) continue;
    for (const range of aff.ranges ?? []) {
      let lastFixed: string | null = null;
      for (const ev of range.events ?? []) {
        if (ev.fixed) lastFixed = ev.fixed;
      }
      if (lastFixed) return lastFixed;
    }
  }
  return null;
}

function extractReferences(vuln: Record<string, unknown>): string[] {
  const refs = vuln.references as Array<{ url?: string }> | undefined;
  if (!Array.isArray(refs)) return [];
  return refs.map((r) => r.url).filter((u): u is string => typeof u === "string");
}
