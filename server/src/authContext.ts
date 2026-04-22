import type { RequestHandler } from "express";
import { getStore } from "./store/appStore.js";

export function getActorUserId(req: Request): string {
  const h = req.headers["x-secureflow-user-id"];
  if (typeof h === "string" && h.trim()) return h.trim();
  return "1";
}

export const requireManager: RequestHandler = (req, res, next) => {
  void (async () => {
    const id = getActorUserId(req);
    const user = await getStore().getUser(id);
    if (!user || user.role !== "manager") {
      res.status(403).json({
        error: "Forbidden",
        message:
          "Manager role required (send header x-secureflow-user-id for a manager user).",
      });
      return;
    }
    next();
  })().catch(next);
};
