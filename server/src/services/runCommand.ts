import { spawn } from "child_process";

export interface RunCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** When true, resolve even if exit code is non-zero (osv-scanner uses 1 when vulns exist). */
  allowNonZeroExit?: boolean;
}

export async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {}
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (c) => out.push(Buffer.from(c)));
    child.stderr.on("data", (c) => err.push(Buffer.from(c)));
    child.on("error", reject);
    child.on("close", (code) => {
      const stdout = Buffer.concat(out).toString("utf8");
      const stderr = Buffer.concat(err).toString("utf8");
      const c = code ?? 0;
      if (c !== 0 && !options.allowNonZeroExit) {
        reject(
          new Error(
            `${command} exited with ${c}\n${stderr.slice(0, 2000)}`
          )
        );
        return;
      }
      resolve({ code: c, stdout, stderr });
    });
  });
}
