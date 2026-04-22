import { Router } from "express";
import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import {
  getActorUserId,
  requireAuth,
  requireManager,
  signAccessToken,
} from "../authContext.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { getStorageMode, getStore } from "../store/appStore.js";
import type { AppDataStore } from "../store/storeTypes.js";
import type { Project, User, VulnerabilityTicket } from "../types.js";
import {
  isValidDisplayName,
  isStrongPassword,
  isValidUsername,
  normalizeGitHubRepositoryInput,
  normalizeUsername,
  parseCvssScore,
  parseSeverity,
  parseTicketStatus,
  parseUserRole,
  sanitizeMultiline,
  sanitizeName,
  sanitizeReferenceList,
  sanitizeRepositoryInput,
  sanitizeSingleLine,
  sanitizeVersion,
} from "../validation.js";
import { broadcast } from "../wsHub.js";
import {
  displayRepo,
  enqueueScan,
  projectNameFromUrl,
  removeProjectWorkdir,
} from "../services/scanOrchestrator.js";
import { assertGitHubRepoAccessible } from "../services/gitClone.js";

export const apiRouter = Router();

type LoginAttempts = { count: number; blockedUntil: number | null };

const loginAttemptsByUsername = new Map<string, LoginAttempts>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_WINDOW_MS = 15 * 60 * 1000;

apiRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "secureflow-api",
    storage: getStorageMode(),
    version: process.env.npm_package_version ?? "0.1.0",
  });
});

apiRouter.post(
  "/auth/login",
  asyncRoute(async (req, res) => {
    const store = getStore();
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password ?? "");

    if (!username || !password) {
      res.status(400).json({ error: "username and password are required" });
      return;
    }

    const now = Date.now();
    const attempts = loginAttemptsByUsername.get(username);
    if (attempts?.blockedUntil && attempts.blockedUntil > now) {
      res.status(429).json({
        error: "Too many attempts",
        message: "Login temporarily locked. Try again later.",
      });
      return;
    }

    const user = await store.getUserByUsername(username);
    const passwordHash = user ? await store.getUserPasswordHash(user.id) : undefined;
    const isValid = Boolean(user && passwordHash && (await compare(password, passwordHash)));

    if (!isValid || !user) {
      const current = loginAttemptsByUsername.get(username) ?? {
        count: 0,
        blockedUntil: null,
      };
      const nextCount = current.count + 1;
      loginAttemptsByUsername.set(username, {
        count: nextCount,
        blockedUntil: nextCount >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_BLOCK_WINDOW_MS : null,
      });
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    loginAttemptsByUsername.delete(username);
    const token = signAccessToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });
    res.json({ token, user });
  })
);

apiRouter.post(
  "/auth/register",
  asyncRoute(async (req, res) => {
    const store = getStore();
    const name = sanitizeName(req.body?.name);
    const username = normalizeUsername(req.body?.username);
    const role = parseUserRole(req.body?.role);
    const password = String(req.body?.password ?? "");

    if (!name || !username || !role || !password) {
      res.status(400).json({ error: "name, username, role, and password are required" });
      return;
    }
    if (!isValidDisplayName(name)) {
      res.status(400).json({ error: "Name must be at least 2 characters long" });
      return;
    }
    if (!isValidUsername(username)) {
      res.status(400).json({
        error:
          "Username must be 3-32 characters and use only lowercase letters, numbers, dots, underscores, or hyphens",
      });
      return;
    }
    if (!isStrongPassword(password)) {
      res.status(400).json({
        error:
          "Password must be at least 8 characters and include upper, lower, and numeric characters",
      });
      return;
    }

    const existing = await store.getUserByUsername(username);
    if (existing) {
      res.status(409).json({ error: "A user with this username already exists" });
      return;
    }

    const user = await store.createUser({ name, username, role });
    await store.setUserPasswordHash(user.id, await hash(password, 12));
    const token = signAccessToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });
    res.status(201).json({ token, user });
  })
);

apiRouter.use(requireAuth);

apiRouter.get(
  "/auth/me",
  asyncRoute(async (req, res) => {
    const user = await getStore().getUser(getActorUserId(req));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({ user });
  })
);

apiRouter.get(
  "/users",
  asyncRoute(async (_req, res) => {
    const store = getStore();
    const users = await store.listUsers();
    const tickets = await store.listTickets();
    const enriched = users.map((user) => ({
      ...user,
      metrics: {
        assigned: tickets.filter((ticket) => ticket.assigneeId === user.id).length,
        inProgress: tickets.filter(
          (ticket) =>
            ticket.assigneeId === user.id && ticket.status === "in-progress"
        ).length,
        completed: tickets.filter(
          (ticket) => ticket.assigneeId === user.id && ticket.status === "done"
        ).length,
      },
    }));
    res.json(enriched);
  })
);

apiRouter.post(
  "/users",
  requireManager,
  asyncRoute(async (req, res) => {
    const store = getStore();
    const name = sanitizeName(req.body?.name);
    const username = normalizeUsername(req.body?.username);
    const role = parseUserRole(req.body?.role);
    const password =
      typeof req.body?.password === "string" && req.body.password.trim()
        ? String(req.body.password)
        : null;

    if (!name || !username || !role) {
      res.status(400).json({ error: "name, username, and role are required" });
      return;
    }
    if (!isValidDisplayName(name)) {
      res.status(400).json({ error: "Name must be at least 2 characters long" });
      return;
    }
    if (!isValidUsername(username)) {
      res.status(400).json({
        error:
          "Username must be 3-32 characters and use only lowercase letters, numbers, dots, underscores, or hyphens",
      });
      return;
    }
    if (password && !isStrongPassword(password)) {
      res.status(400).json({
        error:
          "Password must be at least 8 characters and include upper, lower, and numeric characters",
      });
      return;
    }

    const existing = await store.getUserByUsername(username);
    if (existing) {
      res.status(409).json({ error: "A user with this username already exists" });
      return;
    }

    const user = await store.createUser({ name, username, role });
    const assignedPassword = password ?? generateTemporaryPassword();
    await store.setUserPasswordHash(user.id, await hash(assignedPassword, 12));
    res.status(201).json({
      ...user,
      temporaryPassword: password ? undefined : assignedPassword,
    });
  })
);

apiRouter.delete(
  "/users/:id",
  requireManager,
  asyncRoute(async (req, res) => {
    const store = getStore();
    const targetId = sanitizeSingleLine(req.params.id, 80);
    const actorId = getActorUserId(req);

    if (!targetId) {
      res.status(400).json({ error: "A valid user id is required" });
      return;
    }
    if (targetId === actorId) {
      res.status(400).json({ error: "You cannot delete the account you are signed in with" });
      return;
    }

    const deleted = await store.deleteUser(targetId);
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await store.pushActivity({
      kind: "user.deleted",
      message: `User removed: ${deleted.name}`,
      meta: { userId: deleted.id },
    });
    broadcast({ type: "user.deleted", payload: { userId: deleted.id } });
    broadcast({ type: "tickets.sync", payload: { userId: deleted.id } });
    res.json({ ok: true, userId: deleted.id });
  })
);

apiRouter.get(
  "/projects",
  asyncRoute(async (_req, res) => {
    const projects = await getStore().listProjects();
    res.json(projects.map(publicProject));
  })
);

apiRouter.get(
  "/projects/:id",
  asyncRoute(async (req, res) => {
    const project = await getStore().getProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(publicProject(project));
  })
);

apiRouter.post(
  "/projects",
  requireManager,
  asyncRoute(async (req, res) => {
    const store = getStore();
    const repositoryInput = sanitizeRepositoryInput(req.body?.repositoryUrl);
    if (!repositoryInput) {
      res.status(400).json({ error: "repositoryUrl is required" });
      return;
    }
    const repositoryUrl = normalizeGitHubRepositoryInput(repositoryInput);
    if (!repositoryUrl) {
      res.status(400).json({
        error:
          "Enter a valid GitHub repository URL or owner/repository path, for example github.com/owner/repository",
      });
      return;
    }

    const repository = displayRepo(repositoryUrl);
    const existing = await store.findProjectByRepository(repository);
    if (existing) {
      res.status(409).json({
        error: "Duplicate repository",
        projectId: existing.id,
      });
      return;
    }

    const settings = await store.getSettings();
    try {
      await assertGitHubRepoAccessible(
        repositoryUrl,
        settings.githubPat ?? process.env.GITHUB_TOKEN ?? null
      );
    } catch {
      res.status(400).json({
        error:
          "Repository could not be reached. Check the GitHub URL, repository visibility, and configured access token.",
      });
      return;
    }

    const name = sanitizeSingleLine(projectNameFromUrl(repositoryUrl), 100);
    const project = await store.createProject({
      name,
      repository,
      localPath: null,
      scanStatus: "queued",
    });
    await store.pushActivity({
      kind: "project.created",
      message: `Project added: ${name}`,
      meta: { projectId: project.id },
    });
    broadcast({ type: "project.created", payload: publicProject(project) });
    res.status(201).json(publicProject(project));
    void enqueueScan(project.id);
  })
);

apiRouter.post(
  "/projects/:id/scan",
  requireManager,
  asyncRoute(async (req, res) => {
    const project = await getStore().getProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(202).json({ ok: true, projectId: project.id, scanStatus: "queued" });
    void enqueueScan(project.id);
  })
);

apiRouter.delete(
  "/projects/:id",
  requireManager,
  asyncRoute(async (req, res) => {
    const store = getStore();
    const projectId = sanitizeSingleLine(req.params.id, 80);
    const project = await store.getProject(projectId);

    if (!project) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (project.scanStatus === "queued" || project.scanStatus === "scanning") {
      res.status(409).json({
        error: "Wait for the current scan to finish before deleting this project",
      });
      return;
    }

    const deleted = await store.deleteProject(projectId);
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await removeProjectWorkdir(deleted.localPath);
    await store.pushActivity({
      kind: "project.deleted",
      message: `Project removed: ${deleted.name}`,
      meta: { projectId: deleted.id },
    });
    broadcast({ type: "project.deleted", payload: { projectId: deleted.id } });
    broadcast({ type: "tickets.sync", payload: { projectId: deleted.id } });
    res.json({ ok: true, projectId: deleted.id });
  })
);

apiRouter.get(
  "/tickets",
  asyncRoute(async (req, res) => {
    const store = getStore();
    const tickets = await store.listTickets({
      projectId:
        typeof req.query.projectId === "string" ? req.query.projectId : undefined,
      assigneeId:
        typeof req.query.assigneeId === "string" ? req.query.assigneeId : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      severity:
        typeof req.query.severity === "string" ? req.query.severity : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
    });
    res.json(await Promise.all(tickets.map((ticket) => expandTicket(store, ticket))));
  })
);

apiRouter.post(
  "/tickets",
  requireManager,
  asyncRoute(async (req, res) => {
    const store = getStore();
    const projectId = sanitizeSingleLine(req.body?.projectId, 64);
    const project = await store.getProject(projectId);
    if (!project) {
      res.status(400).json({ error: "A valid projectId is required" });
      return;
    }

    const osvId = sanitizeSingleLine(req.body?.osvId, 120);
    const summary = sanitizeSingleLine(req.body?.summary, 200);
    const description = sanitizeMultiline(req.body?.description, 4000);
    const severity = parseSeverity(req.body?.severity);
    const packageName = sanitizeSingleLine(req.body?.package, 150);
    const ecosystem = sanitizeSingleLine(req.body?.ecosystem, 80);
    const currentVersion = sanitizeVersion(req.body?.currentVersion);
    const fixedVersion = sanitizeVersion(req.body?.fixedVersion) || null;
    const status = parseTicketStatus(req.body?.status);
    const assigneeId =
      req.body?.assigneeId === null || req.body?.assigneeId === undefined
        ? null
        : sanitizeSingleLine(req.body?.assigneeId, 80);

    if (
      !osvId ||
      !summary ||
      !description ||
      !severity ||
      !packageName ||
      !ecosystem ||
      !currentVersion
    ) {
      res.status(400).json({
        error:
          "projectId, osvId, summary, description, severity, package, ecosystem, and currentVersion are required",
      });
      return;
    }

    const existingProjectTickets = await store.listTickets({ projectId });
    if (
      existingProjectTickets.some(
        (ticket) => ticket.osvId.toLowerCase() === osvId.toLowerCase()
      )
    ) {
      res.status(409).json({ error: "A ticket with this OSV ID already exists for the project" });
      return;
    }

    const assignee = assigneeId ? await store.getUser(assigneeId) : null;
    if (assigneeId && (!assignee || assignee.role !== "developer")) {
      res.status(400).json({ error: "assigneeId must reference a developer" });
      return;
    }

    const ticket = await store.createTicket({
      projectId,
      source: "manual",
      osvId,
      summary,
      description,
      severity,
      cvssScore: parseCvssScore(req.body?.cvssScore),
      package: packageName,
      ecosystem,
      currentVersion,
      fixedVersion,
      status,
      assigneeId,
      references: sanitizeReferenceList(req.body?.references),
    });

    await store.pushActivity({
      kind: "ticket.created",
      message: `Ticket ${ticket.osvId} created`,
      meta: { ticketId: ticket.id, projectId: ticket.projectId },
    });
    broadcast({ type: "ticket.created", payload: await expandTicket(store, ticket) });
    res.status(201).json(await expandTicket(store, ticket));
  })
);

apiRouter.get(
  "/tickets/:id",
  asyncRoute(async (req, res) => {
    const store = getStore();
    const ticket = await store.getTicket(req.params.id);
    if (!ticket) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(await expandTicket(store, ticket));
  })
);

apiRouter.patch(
  "/tickets/:id",
  asyncRoute(async (req, res) => {
    const store = getStore();
    const actorId = getActorUserId(req);
    const actor = await store.getUser(actorId);
    const existing = await store.getTicket(req.params.id);

    if (!actor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const nextStatus =
      req.body?.status === undefined ? undefined : parseTicketStatus(req.body?.status);
    const nextAssigneeId =
      req.body?.assigneeId === undefined
        ? undefined
        : req.body?.assigneeId === null
          ? null
          : sanitizeSingleLine(req.body?.assigneeId, 80);

    if (nextStatus === undefined && nextAssigneeId === undefined) {
      res.status(400).json({ error: "Provide status or assigneeId to update the ticket" });
      return;
    }

    if (nextAssigneeId !== undefined) {
      if (actor.role !== "manager") {
        res.status(403).json({ error: "Only managers can assign tickets" });
        return;
      }
      if (nextAssigneeId) {
        const assignee = await store.getUser(nextAssigneeId);
        if (!assignee || assignee.role !== "developer") {
          res.status(400).json({ error: "assigneeId must reference a developer" });
          return;
        }
      }
    }

    if (nextStatus !== undefined) {
      const isManager = actor.role === "manager";
      const isAssignee = existing.assigneeId === actor.id;
      if (!isManager && !isAssignee) {
        res.status(403).json({
          error: "Developers may only update tickets assigned to them",
        });
        return;
      }
    }

    const updated = await store.updateTicket(req.params.id, {
      status: nextStatus,
      assigneeId: nextAssigneeId,
    });
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await store.pushActivity({
      kind: nextAssigneeId !== undefined ? "ticket.assigned" : "ticket.updated",
      message: `Ticket ${updated.osvId} updated`,
      meta: { ticketId: updated.id, projectId: updated.projectId },
    });
    broadcast({ type: "ticket.updated", payload: await expandTicket(store, updated) });
    res.json(await expandTicket(store, updated));
  })
);

apiRouter.delete(
  "/tickets/:id",
  requireManager,
  asyncRoute(async (req, res) => {
    const store = getStore();
    const ticketId = sanitizeSingleLine(req.params.id, 80);
    const deleted = await store.deleteTicket(ticketId);

    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await store.pushActivity({
      kind: "ticket.deleted",
      message: `Ticket ${deleted.osvId} removed`,
      meta: { ticketId: deleted.id, projectId: deleted.projectId },
    });
    broadcast({ type: "ticket.deleted", payload: { ticketId: deleted.id, projectId: deleted.projectId } });
    res.json({ ok: true, ticketId: deleted.id, projectId: deleted.projectId });
  })
);

apiRouter.get(
  "/dashboard/summary",
  asyncRoute(async (_req, res) => {
    const store = getStore();
    const tickets = await store.listTickets();
    const projects = await store.listProjects();
    const openTickets = tickets.filter((ticket) => ticket.status !== "done");

    res.json({
      totals: {
        vulnerabilities: tickets.length,
        open: openTickets.length,
        resolved: tickets.filter((ticket) => ticket.status === "done").length,
        critical: tickets.filter((ticket) => ticket.severity === "CRITICAL").length,
        high: tickets.filter((ticket) => ticket.severity === "HIGH").length,
        medium: tickets.filter((ticket) => ticket.severity === "MEDIUM").length,
        low: tickets.filter((ticket) => ticket.severity === "LOW").length,
      },
      byStatus: {
        todo: tickets.filter((ticket) => ticket.status === "todo").length,
        "in-progress": tickets.filter((ticket) => ticket.status === "in-progress").length,
        "in-review": tickets.filter((ticket) => ticket.status === "in-review").length,
        done: tickets.filter((ticket) => ticket.status === "done").length,
      },
      projects: projects.length,
      scanning: projects.filter((project) => project.scanStatus === "scanning").length,
    });
  })
);

apiRouter.get(
  "/activity",
  asyncRoute(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    res.json(await getStore().listActivities(limit));
  })
);

apiRouter.get(
  "/settings",
  asyncRoute(async (_req, res) => {
    const settings = await getStore().getSettings();
    res.json({
      githubPatConfigured: Boolean(settings.githubPat),
    });
  })
);

apiRouter.put(
  "/settings",
  requireManager,
  asyncRoute(async (req, res) => {
    const store = getStore();
    const next = await store.updateSettings({
      ...(req.body?.githubPat !== undefined
        ? { githubPat: sanitizeSingleLine(req.body.githubPat, 400) || null }
        : {}),
    });
    res.json({
      githubPatConfigured: Boolean(next.githubPat),
    });
  })
);

function publicProject(project: Project) {
  const { localPath: _localPath, ...rest } = project;
  return rest;
}

function generateTemporaryPassword(): string {
  return `Tmp-${randomBytes(6).toString("base64url")}A1`;
}

async function expandTicket(store: AppDataStore, ticket: VulnerabilityTicket) {
  const assignee: User | null = ticket.assigneeId
    ? (await store.getUser(ticket.assigneeId)) ?? null
    : null;
  return { ...ticket, assignee };
}
