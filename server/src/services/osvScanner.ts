import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { VulnerabilityTicket } from "../types.js";
import { parseVuln, type OsvVulnerability } from "./osvClient.js";
import { runCommand } from "./runCommand.js";

const LOCAL_OSV_SCANNER_PATH = fileURLToPath(
  new URL("../../bin/osv-scanner", import.meta.url)
);
const SUCCESS_EXIT_CODES = new Set([0, 1]);

type OsvScannerOutput = {
  results?: Array<{
    source?: {
      path?: string;
      type?: string;
    };
    packages?: Array<{
      package?: {
        name?: string;
        version?: string;
        ecosystem?: string;
      };
      vulnerabilities?: OsvVulnerability[];
    }>;
  }>;
};

export async function scanDirectoryWithOsv(
  repoPath: string
): Promise<Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt">[]> {
  const scannerBinary = await resolveOsvScannerBinary();
  const { code, stdout, stderr } = await runCommand(
    scannerBinary,
    [
      "scan",
      "source",
      "--recursive",
      "--no-ignore",
      "--format",
      "json",
      "--verbosity",
      "error",
      "--no-call-analysis=go",
      repoPath,
    ],
    { allowNonZeroExit: true }
  );

  if (!SUCCESS_EXIT_CODES.has(code)) {
    throw buildScannerError(code, stderr, stdout, scannerBinary);
  }

  return dedupeFindings(parseOsvScannerOutput(stdout));
}

export function parseOsvScannerOutput(
  stdout: string
): Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt">[] {
  if (!stdout.trim()) {
    return [];
  }

  let parsed: OsvScannerOutput;
  try {
    parsed = JSON.parse(stdout) as OsvScannerOutput;
  } catch {
    throw new Error("osv-scanner returned invalid JSON output");
  }

  const findings: Omit<
    VulnerabilityTicket,
    "id" | "projectId" | "createdAt" | "updatedAt"
  >[] = [];

  for (const result of parsed.results ?? []) {
    for (const pkg of result.packages ?? []) {
      const packageName = pkg.package?.name?.trim();
      const version = pkg.package?.version?.trim();
      const ecosystem = pkg.package?.ecosystem?.trim();
      if (!packageName || !version || !ecosystem) continue;

      for (const vulnerability of pkg.vulnerabilities ?? []) {
        findings.push(parseVuln(vulnerability, packageName, ecosystem, version));
      }
    }
  }

  return findings;
}

async function resolveOsvScannerBinary(): Promise<string> {
  const configured = process.env.OSV_SCANNER_BIN?.trim();
  for (const candidate of [configured, LOCAL_OSV_SCANNER_PATH]) {
    if (!candidate) continue;
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return "osv-scanner";
}

function buildScannerError(
  code: number,
  stderr: string,
  stdout: string,
  scannerBinary: string
): Error {
  const message = extractScannerMessage(stderr) ?? extractScannerMessage(stdout);

  if (code === 128) {
    return new Error(
      message ??
        "No supported dependency manifests were found by osv-scanner while scanning the repository recursively."
    );
  }

  if (
    /(?:not found|enoent|spawn .*osv-scanner)/i.test(stderr) ||
    /(?:not found|enoent|spawn .*osv-scanner)/i.test(stdout)
  ) {
    return new Error(
      `osv-scanner is not available. Expected binary at ${scannerBinary} or on PATH.`
    );
  }

  return new Error(message ?? `osv-scanner exited with code ${code}`);
}

function extractScannerMessage(output: string): string | null {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]!;
    if (line.startsWith("{") || line.startsWith("[")) continue;
    if (/^scanned /i.test(line)) continue;
    return line.replace(/^error:\s*/i, "");
  }

  return null;
}

function dedupeFindings(
  findings: Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt">[]
): Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt">[] {
  const unique = new Map<
    string,
    Omit<VulnerabilityTicket, "id" | "projectId" | "createdAt" | "updatedAt">
  >();

  for (const finding of findings) {
    const key = `${finding.osvId}:${finding.package}:${finding.ecosystem}:${finding.currentVersion}`;
    if (!unique.has(key)) {
      unique.set(key, finding);
    }
  }

  return [...unique.values()].sort((left, right) =>
    `${left.severity}:${left.osvId}:${left.package}`.localeCompare(
      `${right.severity}:${right.osvId}:${right.package}`
    )
  );
}
