import { runCommand } from "./runCommand.js";

/**
 * Runs osv-scanner against a cloned repository directory.
 * osv-scanner exits with code 1 when vulnerabilities are present; stdout still contains valid JSON.
 */
export async function scanDirectoryWithOsvScanner(repoPath: string): Promise<string> {
  const attempts: [string, string[]][] = [
    ["osv-scanner", ["-r", repoPath, "--format", "json"]],
    ["osv-scanner", ["scan", "--recursive", repoPath, "--format", "json"]],
  ];

  let lastErr: Error | undefined;
  for (const [cmd, args] of attempts) {
    try {
      const { stdout } = await runCommand(cmd, args, {
        allowNonZeroExit: true,
      });
      if (stdout.trim()) return stdout;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new Error(
    lastErr?.message ??
      "osv-scanner produced no output. Install from https://google.github.io/osv-scanner/ and ensure it is on PATH."
  );
}
