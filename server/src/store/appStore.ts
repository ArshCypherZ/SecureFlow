import { Pool } from "pg";
import { ensurePostgresSchema, seedPostgresIfEmpty } from "../db/initPostgres.js";
import { createPostgresStore } from "./postgresStore.js";
import { memoryStore } from "./memoryStore.js";
import { syncTicketsToNotepad } from "./ticketNotepad.js";
import type { AppDataStore } from "./storeTypes.js";

let activeStore: AppDataStore | null = null;
let pgPool: Pool | null = null;

export function getStorageMode(): "postgres" | "memory" {
  return pgPool ? "postgres" : "memory";
}

function wrapTicketNotepad(inner: AppDataStore): AppDataStore {
  const flush = async () => {
    syncTicketsToNotepad(await inner.listTickets());
  };
  return {
    listUsers() {
      return inner.listUsers();
    },
    getUser(id: string) {
      return inner.getUser(id);
    },
    createUser(input: Parameters<AppDataStore["createUser"]>[0]) {
      return inner.createUser(input);
    },
    listProjects() {
      return inner.listProjects();
    },
    getProject(id: string) {
      return inner.getProject(id);
    },
    findProjectByRepository(repo: string) {
      return inner.findProjectByRepository(repo);
    },
    createProject(input: Parameters<AppDataStore["createProject"]>[0]) {
      return inner.createProject(input);
    },
    updateProject(id: string, patch: Parameters<AppDataStore["updateProject"]>[1]) {
      return inner.updateProject(id, patch);
    },
    listTickets(filters?: Parameters<AppDataStore["listTickets"]>[0]) {
      return inner.listTickets(filters);
    },
    getTicket(id: string) {
      return inner.getTicket(id);
    },
    async createTicket(input) {
      const t = await inner.createTicket(input);
      await flush();
      return t;
    },
    async upsertTicketsForProject(projectId, incoming) {
      const r = await inner.upsertTicketsForProject(projectId, incoming);
      await flush();
      return r;
    },
    async updateTicket(id, patch) {
      const t = await inner.updateTicket(id, patch);
      if (t) await flush();
      return t;
    },
    async deleteTicketsForProject(projectId) {
      await inner.deleteTicketsForProject(projectId);
      await flush();
    },
    pushActivity(event: Parameters<AppDataStore["pushActivity"]>[0]) {
      return inner.pushActivity(event);
    },
    listActivities(limit?: number) {
      return inner.listActivities(limit);
    },
    getSettings() {
      return inner.getSettings();
    },
    updateSettings(patch: Parameters<AppDataStore["updateSettings"]>[0]) {
      return inner.updateSettings(patch);
    },
  };
}

export async function initAppStore(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    pgPool = new Pool({ connectionString: url });
    await ensurePostgresSchema(pgPool);
    await seedPostgresIfEmpty(pgPool);
    activeStore = wrapTicketNotepad(createPostgresStore(pgPool));
  } else {
    pgPool = null;
    activeStore = wrapTicketNotepad(memoryStore);
  }
  syncTicketsToNotepad(await activeStore.listTickets());
}

export function getStore(): AppDataStore {
  if (!activeStore) {
    throw new Error("Data store not initialized; call initAppStore() before accepting traffic.");
  }
  return activeStore;
}

export async function shutdownAppStore(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  activeStore = null;
}
