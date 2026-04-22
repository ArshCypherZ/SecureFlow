import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { runCommand } from "./runCommand.js";

export interface CloneResult {
  path: string;
}

export async function cloneGitHubRepo(
  repositoryUrl: string,
  baseDir: string,
  token?: string | null
): Promise<CloneResult> {
  const normalized = normalizeGitHubHttps(repositoryUrl);
  const dirName = safeDirName(normalized);
  const dest = join(baseDir, `${dirName}-${Date.now()}`);
  await mkdir(baseDir, { recursive: true });

  const cloneUrl = injectGithubToken(normalized, token);
  await runCommand(
    "git",
    ["clone", "--depth", "1", "--recurse-submodules", "--shallow-submodules", cloneUrl, dest],
    { allowNonZeroExit: false }
  );
  return { path: dest };
}

export async function assertGitHubRepoAccessible(
  repositoryUrl: string,
  token?: string | null
): Promise<void> {
  const normalized = normalizeGitHubHttps(repositoryUrl);
  const cloneUrl = injectGithubToken(normalized, token);
  await runCommand("git", ["ls-remote", "--exit-code", cloneUrl, "HEAD"], {
    allowNonZeroExit: false,
  });
}

export function normalizeGitHubHttps(url: string): string {
  let u = url.trim();
  if (u.startsWith("git@github.com:")) {
    u = "https://github.com/" + u.slice("git@github.com:".length);
  }
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    if (u.includes("github.com")) {
      u = "https://" + u.replace(/^\/+/, "");
    } else {
      u = `https://github.com/${u.replace(/^\/+/, "")}`;
    }
  }
  u = u.replace(/\.git$/i, "");
  return u;
}

function injectGithubToken(httpsUrl: string, token?: string | null): string {
  if (!token) return httpsUrl;
  try {
    const u = new URL(httpsUrl);
    if (u.hostname !== "github.com") return httpsUrl;
    u.username = "git";
    u.password = token;
    return u.toString();
  } catch {
    return httpsUrl;
  }
}

function safeDirName(repoUrl: string): string {
  try {
    const u = new URL(repoUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    return `${parts[0] ?? "org"}-${parts[1] ?? "repo"}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  } catch {
    return "repo";
  }
}

export async function removeWorkdir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}
