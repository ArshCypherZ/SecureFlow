import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { VulnerabilityTicket } from "../types.js";

export function defaultTicketsNotepadPath(): string {
  const fromEnv = process.env.TICKETS_NOTEPAD_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "data", "tickets-notepad.txt");
}

function formatTicket(t: VulnerabilityTicket, index: number): string {
  const refs = t.references.length ? t.references.join("\n    ") : "(none)";
  return `
--------------------------------------------------------------------------------
#${index + 1}  Ticket ID: ${t.id}
OSV ID:       ${t.osvId}
Project ID:   ${t.projectId}
Severity:     ${t.severity}   CVSS: ${t.cvssScore}
Status:       ${t.status}
Package:      ${t.package} (${t.ecosystem})
Versions:     current=${t.currentVersion}   fixed=${t.fixedVersion ?? "n/a"}
Assignee ID:  ${t.assigneeId ?? "unassigned"}
Summary:      ${t.summary}
Description:  ${t.description.replace(/\s+/g, " ").slice(0, 500)}${t.description.length > 500 ? "…" : ""}
References:
    ${refs}
Created: ${t.createdAt}   Updated: ${t.updatedAt}
`;
}

/**
 * Writes all tickets to a UTF-8 text file (open with Windows Notepad).
 * Safe to call after every ticket mutation.
 */
export function syncTicketsToNotepad(tickets: VulnerabilityTicket[]): void {
  const path = defaultTicketsNotepadPath();
  try {
    mkdirSync(dirname(path), { recursive: true });
  } catch {
    /* ignore */
  }
  const header = `SecureFlow — vulnerability tickets export
Generated (UTC): ${new Date().toISOString()}
Total tickets: ${tickets.length}
================================================================================
`;
  const body = tickets
    .slice()
    .sort((a, b) => a.projectId.localeCompare(b.projectId) || a.osvId.localeCompare(b.osvId))
    .map(formatTicket)
    .join("\n");
  writeFileSync(path, header + body + "\n", { encoding: "utf8" });
}
