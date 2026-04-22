import type { Severity, TicketStatus, UserRole } from "./types.js";

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/;
const GITHUB_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ");
}

export function sanitizeName(value: unknown): string {
  return stripControlCharacters(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function normalizeUsername(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function usernameFromSeed(...seeds: unknown[]): string {
  const raw =
    seeds
      .map((seed) => String(seed ?? "").trim())
      .find(Boolean) ?? "user";
  let username = raw
    .toLowerCase()
    .replace(/^.*@/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "");

  if (!username) username = "user";
  if (!/^[a-z0-9]/.test(username)) username = `u${username}`;
  if (!/[a-z0-9]$/.test(username)) username = `${username}0`;
  if (username.length < 3) username = `${username}user`;
  username = username.slice(0, 32).replace(/[^a-z0-9]+$/, "");
  if (username.length < 3) username = "user";
  return username;
}

export function sanitizeSingleLine(value: unknown, maxLength = 200): string {
  return stripControlCharacters(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultiline(value: unknown, maxLength = 8000): string {
  return stripControlCharacters(String(value ?? ""))
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeRepositoryInput(value: unknown): string {
  return sanitizeSingleLine(value, 300);
}

export function normalizeGitHubRepositoryInput(value: unknown): string | null {
  const raw = sanitizeRepositoryInput(value).replace(/\/+$/, "");
  if (!raw) return null;

  let owner = "";
  let repo = "";

  if (/^git@github\.com:/i.test(raw)) {
    const sshPath = raw.replace(/^git@github\.com:/i, "").replace(/\/+$/, "");
    [owner = "", repo = ""] = sshPath.split("/").filter(Boolean);
  } else if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (!/^(?:www\.)?github\.com$/i.test(url.hostname)) return null;
      const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (parts.length !== 2) return null;
      [owner = "", repo = ""] = parts;
    } catch {
      return null;
    }
  } else {
    const normalized = raw.replace(/^github\.com\//i, "");
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    [owner = "", repo = ""] = parts;
  }

  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim().replace(/\.git$/i, "");
  if (!normalizedOwner || !normalizedRepo) return null;
  if (!GITHUB_SEGMENT_PATTERN.test(normalizedOwner)) return null;
  if (!GITHUB_SEGMENT_PATTERN.test(normalizedRepo)) return null;

  return `https://github.com/${normalizedOwner}/${normalizedRepo}`;
}

export function sanitizeVersion(value: unknown): string {
  return sanitizeSingleLine(value, 120);
}

export function sanitizeUrl(value: unknown): string | null {
  const raw = sanitizeSingleLine(value, 1000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeReferenceList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const refs: string[] = [];
  for (const item of value) {
    const normalized = sanitizeUrl(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    refs.push(normalized);
  }
  return refs;
}

export function parseUserRole(value: unknown): UserRole | null {
  return value === "manager" || value === "developer" ? value : null;
}

export function parseSeverity(value: unknown): Severity | null {
  return value === "CRITICAL" ||
    value === "HIGH" ||
    value === "MEDIUM" ||
    value === "LOW"
    ? value
    : null;
}

export function parseTicketStatus(
  value: unknown,
  fallback: TicketStatus = "todo"
): TicketStatus {
  return value === "todo" ||
    value === "in-progress" ||
    value === "in-review" ||
    value === "done"
    ? value
    : fallback;
}

export function parseCvssScore(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(10, Math.max(0, Math.round(numeric * 10) / 10));
}

export function isStrongPassword(value: string): boolean {
  if (value.length < 8) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/[0-9]/.test(value)) return false;
  return true;
}

export function isValidDisplayName(value: string): boolean {
  return value.trim().length >= 2;
}
