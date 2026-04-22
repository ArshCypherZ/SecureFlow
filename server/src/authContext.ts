import "./loadEnv.js";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Request, RequestHandler } from "express";
import { getStore } from "./store/appStore.js";
import type { UserRole } from "./types.js";

type AuthClaims = {
  sub: string;
  username: string;
  role: UserRole;
  name: string;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthClaims;
};

const JWT_SECRET =
  process.env.JWT_SECRET?.trim() || randomBytes(32).toString("hex");
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN?.trim() || "8h") as jwt.SignOptions["expiresIn"];

if (!process.env.JWT_SECRET?.trim()) {
  console.warn("JWT_SECRET is not set; using an ephemeral secret for this process.");
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function signAccessToken(claims: AuthClaims): string {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function getActorUserId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.auth?.sub) return authReq.auth.sub;
  return "";
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "Missing bearer token" });
    return;
  }
  try {
    const claims = jwt.verify(token, JWT_SECRET) as AuthClaims;
    (req as AuthenticatedRequest).auth = claims;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
};

export const requireManager: RequestHandler = (req, res, next) => {
  void (async () => {
    const actorId = getActorUserId(req);
    if (!actorId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await getStore().getUser(actorId);
    if (!user || user.role !== "manager") {
      res.status(403).json({ error: "Forbidden", message: "Manager role required" });
      return;
    }
    next();
  })().catch(next);
};
