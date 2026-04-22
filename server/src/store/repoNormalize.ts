/** Normalize GitHub repo strings for duplicate detection (same as legacy memory store). */
export function normalizeRepo(url: string): string {
  let s = url.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^git@github\.com:/, "github.com/");
  s = s.replace(/\.git$/, "");
  return s.replace(/\/$/, "");
}
