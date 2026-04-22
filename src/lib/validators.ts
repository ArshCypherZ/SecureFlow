const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/;
const GITHUB_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ");
}

export function sanitizeNameInput(value: string): string {
  return stripControlCharacters(value).replace(/\s+/g, " ").trim().slice(0, 80);
}

export function sanitizeSingleLineInput(value: string, maxLength = 200): string {
  return stripControlCharacters(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizeUsernameInput(value: string): string {
  return sanitizeSingleLineInput(value, 32).toLowerCase().replace(/\s+/g, "");
}

export function isValidUsernameInput(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export function isStrongPasswordInput(value: string): boolean {
  if (value.length < 8) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/[0-9]/.test(value)) return false;
  return true;
}

export function isValidDisplayNameInput(value: string): boolean {
  return sanitizeNameInput(value).length >= 2;
}

export function normalizeGitHubRepositoryInput(value: string): string | null {
  const raw = sanitizeSingleLineInput(value, 300).replace(/\/+$/, "");
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
