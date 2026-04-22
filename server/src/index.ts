import "./loadEnv.js";
import http from "node:http";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { WebSocketServer } from "ws";
import { apiRouter } from "./routes/apiRoutes.js";
import { initAppStore, shutdownAppStore } from "./store/appStore.js";
import { registerClient } from "./wsHub.js";

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/api", apiRouter);

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
  registerClient(ws);
  ws.send(JSON.stringify({ type: "connected", payload: { ok: true } }));
});

const PORT = Number(process.env.PORT) || 4000;

async function main(): Promise<void> {
  await initAppStore();
  server.listen(PORT, () => {
    console.log(`SecureFlow API listening on http://localhost:${PORT}`);
    console.log(`WebSocket at ws://localhost:${PORT}/ws`);
  });
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});

const shutdown = () => {
  void shutdownAppStore().finally(() => {
    server.close(() => process.exit(0));
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
