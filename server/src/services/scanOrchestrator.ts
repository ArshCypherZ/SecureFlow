import { mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { getStore } from "../store/appStore.js";
import { broadcast } from "../wsHub.js";
import {
  cloneGitHubRepo,
  normalizeGitHubHttps,
  removeWorkdir,
} from "./gitClone.js";
import { scanDirectoryWithOsv } from "./osvScanner.js";

const workRoot = () => join(tmpdir(), "secureflow-repos");

export async function enqueueScan(projectId: string): Promise<void> {
  const store = getStore();
  const project = await store.getProject(projectId);
  if (!project) return;

  await store.updateProject(projectId, { scanStatus: "scanning", scanError: null });
  await store.pushActivity({
    kind: "project.scan_started",
    message: `Scan started for ${project.name}`,
    meta: { projectId },
  });
  broadcast({
    type: "project.scan_started",
    payload: { projectId },
  });

  let workdir: string | null = null;
  const previousWorkdir = project.localPath;

  try {
    if (previousWorkdir) {
      await removeWorkdir(previousWorkdir);
    }

    const repo = project.repository;
    const httpsUrl = repo.startsWith("http") ? repo : `https://${repo}`;
    const settings = await store.getSettings();
    const token = settings.githubPat ?? process.env.GITHUB_TOKEN ?? null;
    await mkdir(workRoot(), { recursive: true });
    const cloned = await cloneGitHubRepo(httpsUrl, workRoot(), token);
    workdir = cloned.path;

    const rows = await scanDirectoryWithOsv(workdir);
    await store.upsertTicketsForProject(projectId, rows);
    await store.updateProject(projectId, {
      scanStatus: "ready",
      scanError: null,
      lastScan: new Date().toISOString(),
      localPath: null,
    });
    const updated = await store.getProject(projectId);
    await store.pushActivity({
      kind: "project.scan_completed",
      message: `Scan completed for ${updated?.name ?? projectId} (${rows.length} findings)`,
      meta: { projectId, count: rows.length },
    });
    broadcast({ type: "project.scan_completed", payload: { projectId } });
    broadcast({ type: "tickets.sync", payload: { projectId } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await store.updateProject(projectId, {
      scanStatus: "error",
      scanError: msg,
    });
    await store.pushActivity({
      kind: "project.scan_failed",
      message: `Scan failed for ${project.name}: ${msg}`,
      meta: { projectId },
    });
    broadcast({
      type: "project.scan_failed",
      payload: { projectId, error: msg },
    });
  } finally {
    if (workdir) {
      await removeProjectWorkdir(workdir);
    }
  }
}

export function projectNameFromUrl(url: string): string {
  try {
    const n = normalizeGitHubHttps(url);
    const u = new URL(n);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "repository";
  } catch {
    return "repository";
  }
}

export function displayRepo(url: string): string {
  const n = normalizeGitHubHttps(url);
  try {
    const u = new URL(n);
    return `github.com${u.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export async function removeProjectWorkdir(localPath: string | null): Promise<void> {
  if (!localPath) return;
  try {
    await removeWorkdir(localPath);
  } catch {
  }
}
