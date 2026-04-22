import type { WebSocket } from "ws";
import type { WsMessage } from "./types.js";

const clients = new Set<WebSocket>();

export function registerClient(ws: WebSocket): void {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
}

export function broadcast(message: WsMessage): void {
  const raw = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(raw);
    }
  }
}
