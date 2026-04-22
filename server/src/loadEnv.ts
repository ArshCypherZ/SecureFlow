import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let loaded = false;

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice(7) : line;
    const eq = normalized.indexOf("=");
    if (eq <= 0) continue;

    const key = normalized.slice(0, eq).trim();
    let value = normalized.slice(eq + 1).trim();
    if (!key) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

function loadFile(path: string, protectedKeys: Set<string>, allowOverride = false): void {
  if (!existsSync(path)) return;
  const parsed = parseEnvFile(readFileSync(path, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (protectedKeys.has(key)) continue;
    if (allowOverride || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadEnvironment(): void {
  if (loaded) return;
  loaded = true;

  const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
  const serverEnv = fileURLToPath(new URL("../.env", import.meta.url));
  const protectedKeys = new Set(Object.keys(process.env));

  loadFile(rootEnv, protectedKeys);
  loadFile(serverEnv, protectedKeys, true);
}

loadEnvironment();
