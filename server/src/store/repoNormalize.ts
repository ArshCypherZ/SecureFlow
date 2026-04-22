export function normalizeRepo(url: string): string {
  let s = url.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^git@github\.com:/, "github.com/");
  s = s.replace(/\.git$/, "");
  return s.replace(/\/$/, "");
}
