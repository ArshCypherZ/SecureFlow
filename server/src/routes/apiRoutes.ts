import { Router } from "express";
import { getActorUserId, requireManager } from "../authContext.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { getStorageMode, getStore } from "../store/appStore.js";
import type { AppDataStore } from "../store/storeTypes.js";
import type { Project, User, VulnerabilityTicket } from "../types.js";
import { broadcast } from "../wsHub.js";
import {
  enqueueScan,
  projectNameFromUrl,
  displayRepo,
} from "../services/scanOrchestrator.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "secureflow-api",
    storage: getStorageMode(),
  });
});

apiRouter.get(
  "/users",
  asyncRoute(async (_req, res) => {
    const store = getStore();
    const users = await store.listUsers();
    const tickets = await store.listTickets();
    const enriched = users.map((u) => ({
      ...u,
      metrics: {
        assigned: tickets.filter((t) => t.assigneeId === u.id).length,
        inProgress: tickets.filter(
          (t) => t.assigneeId === u.id && t.status === "in-progress"
        ).length,
        completed: tickets.filter(
          (t) => t.assigneeId === u.id && t.status === "done"
        ).length,
      },
    }));
    res.json(enriched);
  })
);

apiRouter.post("/users", requireManager, asyncRoute(async (req, res) => {
  const store = getStore();
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim();
  const role = req.body?.role === "manager" ? "manager" : "developer";
  if (!name || !email) {
    res.status(400).json({ error: "name and email are required" });
    return;
  }
  const exists = (await store.listUsers()).some(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (exists) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }
  const user = await store.createUser({ name, email, role });
  res.status(201).json(user);
}));

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
    const p = await getStore().getProject(req.params.id);
    if (!p) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(publicProject(p));
  })
);

apiRouter.post("/projects", requireManager, asyncRoute(async (req, res) => {
  const store = getStore();
  const repositoryUrl = String(req.body?.repositoryUrl ?? "").trim();
  if (!repositoryUrl) {
    res.status(400).json({ error: "repositoryUrl is required" });
    return;
  }
  const display = displayRepo(repositoryUrl);
  const existing = await store.findProjectByRepository(display);
  if (existing) {
    res.status(409).json({
      error: "Duplicate repository",
      projectId: existing.id,
    });
    return;
  }
  const name = projectNameFromUrl(repositoryUrl);
  const project = await store.createProject({
    name,
    repository: display,
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
}));

apiRouter.post("/projects/:id/scan", requireManager, asyncRoute(async (req, res) => {
  const p = await getStore().getProject(req.params.id);
  if (!p) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(202).json({ ok: true, projectId: p.id, scanStatus: "queued" });
  void enqueueScan(p.id);
}));

apiRouter.get(
  "/tickets",
  asyncRoute(async (req, res) => {
    const store = getStore();
    const list = await store.listTickets({
      projectId: typeof req.query.projectId === "string" ? req.query.projectId : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      severity:
        typeof req.query.severity === "string" ? req.query.severity : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
    });
    res.json(await Promise.all(list.map((t) => expandTicket(store, t))));
  })
);

apiRouter.post("/tickets", requireManager, asyncRoute(async (req, res) => {
  const store = getStore();
  const b = req.body as Partial<VulnerabilityTicket>;
  const projectId = String(b.projectId ?? "").trim();
  const project = await store.getProject(projectId);
  if (!project) {
    res.status(400).json({ error: "A valid projectId is required" });
    return;
  }
  const required = [
    "osvId",
    "summary",
    "description",
    "severity",
    "package",
    "ecosystem",
    "currentVersion",
  ] as const;
  for (const key of required) {
    if (!String(b[key] ?? "").trim()) {
      res.status(400).json({ error: `${key} is required` });
      return;
    }
  }
  const severity = b.severity;
  if (!["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(String(severity))) {
    res.status(400).json({ error: "severity is invalid" });
    return;
  }
  const status = ["todo", "in-progress", "in-review", "done"].includes(String(b.status))
    ? b.status
    : "todo";
  const assigneeId = b.assigneeId ?? null;
  if (assigneeId && !(await store.getUser(assigneeId))) {
    res.status(400).json({ error: "assigneeId is invalid" });
    return;
  }
  const ticket = await store.createTicket({
    projectId,
    osvId: String(b.osvId).trim(),
    summary: String(b.summary).trim(),
    description: String(b.description).trim(),
    severity: severity as VulnerabilityTicket["severity"],
    cvssScore: Number(b.cvssScore) || 0,
    package: String(b.package).trim(),
    ecosystem: String(b.ecosystem).trim(),
    currentVersion: String(b.currentVersion).trim(),
    fixedVersion: b.fixedVersion ? String(b.fixedVersion).trim() : null,
    status: status as VulnerabilityTicket["status"],
    assigneeId,
    references: Array.isArray(b.references) ? b.references.map(String) : [],
  });
  await store.pushActivity({
    kind: "ticket.created",
    message: `Ticket ${ticket.osvId} created`,
    meta: { ticketId: ticket.id, projectId: ticket.projectId },
  });
  broadcast({ type: "ticket.created", payload: await expandTicket(store, ticket) });
  res.status(201).json(await expandTicket(store, ticket));
}));

apiRouter.get(
  "/tickets/:id",
  asyncRoute(async (req, res) => {
    const store = getStore();
    const t = await store.getTicket(req.params.id);
    if (!t) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(await expandTicket(store, t));
  })
);

apiRouter.patch("/tickets/:id", asyncRoute(async (req, res) => {
  const store = getStore();
  const actor = getActorUserId(req);
  const existing = await store.getTicket(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const body = req.body as {
    status?: VulnerabilityTicket["status"];
    assigneeId?: string | null;
  };
  const user = await store.getUser(actor);

  if (body.assigneeId !== undefined) {
    if (!user || user.role !== "manager") {
      res.status(403).json({ error: "Only managers can assign tickets" });
      return;
    }
  }

  if (body.status !== undefined) {
    const isManager = user?.role === "manager";
    const isAssignee = existing.assigneeId === actor;
    if (!isManager && !isAssignee) {
      res.status(403).json({
        error: "Developers may only update tickets assigned to them",
      });
      return;
    }
  }

  const updated = await store.updateTicket(req.params.id, {
    status: body.status,
    assigneeId: body.assigneeId,
  });
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await store.pushActivity({
    kind: body.assigneeId !== undefined ? "ticket.assigned" : "ticket.updated",
    message: `Ticket ${updated.osvId} updated`,
    meta: { ticketId: updated.id, projectId: updated.projectId },
  });
  broadcast({ type: "ticket.updated", payload: await expandTicket(store, updated) });
  res.json(await expandTicket(store, updated));
}));

apiRouter.get(
  "/dashboard/summary",
  asyncRoute(async (_req, res) => {
    const store = getStore();
    const tickets = await store.listTickets();
    const projects = await store.listProjects();
    const open = tickets.filter((t) => t.status !== "done");
    res.json({
      totals: {
        vulnerabilities: tickets.length,
        open: open.length,
        resolved: tickets.filter((t) => t.status === "done").length,
        critical: tickets.filter((t) => t.severity === "CRITICAL").length,
        high: tickets.filter((t) => t.severity === "HIGH").length,
        medium: tickets.filter((t) => t.severity === "MEDIUM").length,
        low: tickets.filter((t) => t.severity === "LOW").length,
      },
      byStatus: {
        todo: tickets.filter((t) => t.status === "todo").length,
        "in-progress": tickets.filter((t) => t.status === "in-progress").length,
        "in-review": tickets.filter((t) => t.status === "in-review").length,
        done: tickets.filter((t) => t.status === "done").length,
      },
      projects: projects.length,
      scanning: projects.filter((p) => p.scanStatus === "scanning").length,
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
    const s = await getStore().getSettings();
    res.json({
      pushNotifications: s.pushNotifications,
      emailAlerts: s.emailAlerts,
      automaticScanning: s.automaticScanning,
      githubPatConfigured: Boolean(s.githubPat),
      osvApiKeyConfigured: Boolean(s.osvApiKey),
    });
  })
);

apiRouter.put("/settings", requireManager, asyncRoute(async (req, res) => {
  const store = getStore();
  const b = req.body as Partial<{
    pushNotifications: boolean;
    emailAlerts: boolean;
    automaticScanning: boolean;
    githubPat: string | null;
    osvApiKey: string | null;
  }>;
  const next = await store.updateSettings({
    ...(typeof b.pushNotifications === "boolean"
      ? { pushNotifications: b.pushNotifications }
      : {}),
    ...(typeof b.emailAlerts === "boolean" ? { emailAlerts: b.emailAlerts } : {}),
    ...(typeof b.automaticScanning === "boolean"
      ? { automaticScanning: b.automaticScanning }
      : {}),
    ...(b.githubPat !== undefined ? { githubPat: b.githubPat } : {}),
    ...(b.osvApiKey !== undefined ? { osvApiKey: b.osvApiKey } : {}),
  });
  res.json({
    pushNotifications: next.pushNotifications,
    emailAlerts: next.emailAlerts,
    automaticScanning: next.automaticScanning,
    githubPatConfigured: Boolean(next.githubPat),
    osvApiKeyConfigured: Boolean(next.osvApiKey),
  });
}));

function publicProject(p: Project) {
  const { localPath: _lp, ...rest } = p;
  return rest;
}

async function expandTicket(store: AppDataStore, t: VulnerabilityTicket) {
  const assignee: User | null = t.assigneeId
    ? (await store.getUser(t.assigneeId)) ?? null
    : null;
  return { ...t, assignee };
}
