import type { Request, Response, RequestHandler } from "express";

/** Express 4-safe wrapper for async route handlers. */
export function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}
