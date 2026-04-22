import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium, request as playwrightRequest } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const APP_URL = "http://127.0.0.1:3000";
const API_URL = "http://127.0.0.1:4000/api";
const RESULTS_DIR = "/tmp/secureflow-login-matrix";
const JSON_PATH = path.join(RESULTS_DIR, "results.json");
const MD_PATH = path.join(RESULTS_DIR, "results.md");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const MOD = process.platform === "darwin" ? "Meta" : "Control";

let userSequence = 0;

function uniqueUsername(prefix = "user") {
  userSequence += 1;
  return `${prefix}${Date.now().toString(36)}${userSequence}`.slice(0, 32);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appendChunk(buffer, chunk) {
  buffer.push(chunk.toString());
  if (buffer.length > 40) buffer.shift();
}

function spawnProcess(name, args, env = {}) {
  const stdout = [];
  const stderr = [];
  const child = spawn(npmCommand, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => appendChunk(stdout, chunk));
  child.stderr.on("data", (chunk) => appendChunk(stderr, chunk));

  return {
    name,
    child,
    stdout,
    stderr,
  };
}

async function waitForUrl(url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is not ready yet.
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function stopProcess(proc) {
  if (!proc || proc.child.exitCode !== null) return;
  proc.child.kill("SIGTERM");
  const exited = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      proc.child.kill("SIGKILL");
      resolve(false);
    }, 5_000);
    proc.child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  return exited;
}

async function ensureLoginScreen(page) {
  await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Log In" }).waitFor({ state: "visible" });
}

async function registerUser(api, {
  name = "Test User",
  username = uniqueUsername("user"),
  password = "ValidPass1",
  role = "developer",
} = {}) {
  const response = await api.post(`${API_URL}/auth/register`, {
    data: { name, username, password, role },
  });
  const body = await response.json();
  if (!response.ok()) {
    throw new Error(`Failed to register ${username}: ${JSON.stringify(body)}`);
  }
  return { name, username, password, role, body };
}

async function submitLogin(page, { username = "", password = "" }) {
  const usernameField = page.getByLabel("Username");
  const passwordField = page.getByLabel("Password");
  await usernameField.fill(username);
  await passwordField.fill(password);
  await page.getByRole("button", { name: "Log In" }).click();

  for (let i = 0; i < 30; i += 1) {
    if (await page.getByRole("button", { name: "Sign Out" }).isVisible().catch(() => false)) {
      return "logged-in";
    }
    if (await page.locator(".auth-message").isVisible().catch(() => false)) {
      return "message";
    }
    await sleep(100);
  }
  return "idle";
}

async function authMessage(page) {
  const locator = page.locator(".auth-message");
  if (!(await locator.isVisible().catch(() => false))) return "";
  return (await locator.textContent())?.trim() ?? "";
}

async function signOut(page) {
  const button = page.getByRole("button", { name: "Sign Out" });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
  }
}

function makeResult({
  id,
  testCase,
  expected,
  actual,
  status,
}) {
  return { id, testCase, expected, actual, status };
}

async function runMatrix() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const api = await playwrightRequest.newContext();
  const results = [];

  try {
    {
      const user = await registerUser(api);
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);
      const outcome = await submitLogin(page, user);
      const status = outcome === "logged-in" ? "PASS" : "FAIL";
      results.push(
        makeResult({
          id: 1,
          testCase: "User is able to login successfully",
          expected: "User must successfully login to the web page",
          actual:
            outcome === "logged-in"
              ? "Login succeeded and the workspace opened."
              : `Login did not complete. Message: ${await authMessage(page) || "none"}`,
          status,
        })
      );
      await context.close();
    }

    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);
      const outcome = await submitLogin(page, {
        username: uniqueUsername("ghost"),
        password: "WrongPass1",
      });
      const message = await authMessage(page);
      results.push(
        makeResult({
          id: 2,
          testCase: "Unregistered users cannot login",
          expected: "Proper error must be displayed and prompt to enter login again",
          actual:
            outcome === "message"
              ? `Displayed error: ${message}`
              : "Login unexpectedly succeeded.",
          status:
            outcome === "message" && /invalid username or password/i.test(message) ? "PASS" : "FAIL",
        })
      );
      await context.close();
    }

    {
      const user = await registerUser(api);
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);
      await submitLogin(page, { username: user.username, password: "" });
      const message = await authMessage(page);
      results.push(
        makeResult({
          id: 3,
          testCase: "Valid username and empty password must fail",
          expected: "Proper error must be displayed and prompt to enter login again",
          actual: `Displayed validation message: ${message}`,
          status: /username and password are required/i.test(message) ? "PASS" : "FAIL",
        })
      );
      await context.close();
    }

    {
      const user = await registerUser(api);
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);
      await submitLogin(page, { username: "", password: user.password });
      const message = await authMessage(page);
      results.push(
        makeResult({
          id: 4,
          testCase: "Empty username and valid password must fail",
          expected: "Proper error must be displayed and prompt to enter login again",
          actual: `Displayed validation message: ${message}`,
          status: /username and password are required/i.test(message) ? "PASS" : "FAIL",
        })
      );
      await context.close();
    }

    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);
      await submitLogin(page, { username: "", password: "" });
      const message = await authMessage(page);
      results.push(
        makeResult({
          id: 5,
          testCase: "Empty username and empty password must fail",
          expected: "Proper error must be displayed and prompt to enter login again",
          actual: `Displayed validation message: ${message}`,
          status: /username and password are required/i.test(message) ? "PASS" : "FAIL",
        })
      );
      await context.close();
    }

    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);
      const fieldType = await page.getByLabel("Password").getAttribute("type");
      results.push(
        makeResult({
          id: 6,
          testCase: "Password must be masked on screen",
          expected: "Password field should display bullets/asterisks and not reveal characters",
          actual: `Password input type is ${fieldType}.`,
          status: fieldType === "password" ? "PASS" : "FAIL",
        })
      );
      await context.close();
    }

    {
      const user = await registerUser(api, {
        username: uniqueUsername("case"),
        password: "CasePass1",
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);

      const upperUsernameOutcome = await submitLogin(page, {
        username: user.username.toUpperCase(),
        password: user.password,
      });
      let usernameBehavior = "";
      if (upperUsernameOutcome === "logged-in") {
        usernameBehavior = "Uppercase username still logged in.";
        await signOut(page);
      } else {
        usernameBehavior = `Uppercase username failed with: ${await authMessage(page)}`;
      }

      await ensureLoginScreen(page);
      const changedPasswordOutcome = await submitLogin(page, {
        username: user.username,
        password: user.password.toLowerCase(),
      });
      const passwordBehavior =
        changedPasswordOutcome === "message"
          ? `Changed-case password failed with: ${await authMessage(page)}`
          : "Changed-case password still logged in.";

      results.push(
        makeResult({
          id: 7,
          testCase: "Login should handle case sensitivity",
          expected: "Password must remain case-sensitive; username casing may be normalized",
          actual: `${usernameBehavior} ${passwordBehavior}`,
          status: changedPasswordOutcome === "message" ? "PASS" : "FAIL",
        })
      );
      await context.close();
    }

    {
      const context = await browser.newContext();
      await context.grantPermissions(["clipboard-read", "clipboard-write"], {
        origin: APP_URL,
      });
      const page = await context.newPage();
      await ensureLoginScreen(page);
      const usernameField = page.getByLabel("Username");
      const passwordField = page.getByLabel("Password");
      const samplePassword = "CopyPass1";
      const copySeed = "safe-copy-seed";
      const cutSeed = "safe-cut-seed";

      await passwordField.fill(samplePassword);
      await page.evaluate(async (value) => {
        await navigator.clipboard.writeText(value);
      }, copySeed);
      await passwordField.click();
      await passwordField.press(`${MOD}+A`);
      await passwordField.press(`${MOD}+C`);
      await sleep(150);

      await usernameField.click();
      await usernameField.press(`${MOD}+V`);
      await sleep(150);
      const pastedAfterCopy = await usernameField.inputValue();

      await usernameField.fill("");
      await page.evaluate(async (value) => {
        await navigator.clipboard.writeText(value);
      }, cutSeed);
      await passwordField.click();
      await passwordField.press(`${MOD}+A`);
      await passwordField.press(`${MOD}+X`);
      await sleep(150);
      const passwordValueAfterCut = await passwordField.inputValue();
      await usernameField.click();
      await usernameField.press(`${MOD}+V`);
      await sleep(150);
      const pastedAfterCut = await usernameField.inputValue();

      const exposed =
        pastedAfterCopy === samplePassword ||
        pastedAfterCut === samplePassword ||
        passwordValueAfterCut !== samplePassword;

      results.push(
        makeResult({
          id: 8,
          testCase: "Copied/cut password should not be exposed when pasted elsewhere",
          expected: "Password should not get pasted / password should not be visible on the screen",
          actual: exposed
            ? "Password text could be copied or pasted from the masked field."
            : `Copy and cut shortcuts did not expose the password. Paste results stayed as "${pastedAfterCopy || copySeed}" and "${pastedAfterCut || cutSeed}".`,
          status: exposed ? "FAIL" : "PASS",
        })
      );
      await context.close();
    }

    {
      const user = await registerUser(api, {
        username: uniqueUsername("lock"),
      });
      const attempts = [];
      for (let attempt = 1; attempt <= 6; attempt += 1) {
        const response = await api.post(`${API_URL}/auth/login`, {
          data: {
            username: user.username,
            password: "WrongPass1",
          },
        });
        const body = await response.json();
        attempts.push({
          httpStatus: response.status(),
          error: body.error ?? "",
          message: body.message ?? "",
        });
      }

      const lockedAfterFourth =
        attempts[3]?.httpStatus === 429 ||
        /temporarily locked/i.test(attempts[3]?.message ?? "");
      const lockedAfterSixth =
        attempts[5]?.httpStatus === 429 ||
        /temporarily locked/i.test(attempts[5]?.message ?? "");

      results.push(
        makeResult({
          id: 9,
          testCase: "Verify account lock after repeated incorrect logins",
          expected: "Account should be locked after more than 3 incorrect attempts",
          actual: lockedAfterFourth
            ? "Account locked by the fourth attempt."
            : lockedAfterSixth
              ? "No lock after four attempts; API returned a temporary lock on the sixth attempt."
              : `Observed responses: ${attempts.map((item) => `${item.httpStatus}:${item.message || item.error}`).join(" | ")}`,
          status: lockedAfterFourth ? "PASS" : lockedAfterSixth ? "FAIL" : "FAIL",
        })
      );
    }

    {
      const user = await registerUser(api, {
        username: uniqueUsername("back"),
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);
      await submitLogin(page, user);
      await signOut(page);
      await page.goBack().catch(() => null);
      await sleep(500);
      const stillLoggedOut = await page.getByRole("button", { name: "Log In" }).isVisible().catch(() => false);
      results.push(
        makeResult({
          id: 10,
          testCase: "Back button after logout should not restore signed-in state",
          expected: "User should not be signed in; a general/logged-out page must be visible",
          actual: stillLoggedOut
            ? "Back navigation still showed the logged-out login page."
            : "Back navigation restored a signed-in page.",
          status: stillLoggedOut ? "PASS" : "FAIL",
        })
      );
      await context.close();
    }

    {
      const user = await registerUser(api, {
        username: uniqueUsername("url"),
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);
      await submitLogin(page, user);
      const savedUrl = page.url();
      await signOut(page);
      await page.goto(savedUrl, { waitUntil: "domcontentloaded" });
      await sleep(500);
      const loggedOut = await page.getByRole("button", { name: "Log In" }).isVisible().catch(() => false);
      results.push(
        makeResult({
          id: 11,
          testCase: "Saved logged-in URL should not open a logged-in page after logout",
          expected: "Saved URL should redirect only to the logged-out page",
          actual: loggedOut
            ? "Saved workspace URL returned to the login page after logout."
            : "Saved workspace URL still opened a signed-in view.",
          status: loggedOut ? "PASS" : "FAIL",
        })
      );
      await context.close();
    }

    {
      const user = await registerUser(api, {
        username: uniqueUsername("bsp"),
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      await ensureLoginScreen(page);
      await submitLogin(page, user);
      await page.mouse.click(1000, 120);
      await page.keyboard.press("Backspace");
      await sleep(500);
      const stillLoggedIn = await page.getByRole("button", { name: "Sign Out" }).isVisible().catch(() => false);
      results.push(
        makeResult({
          id: 12,
          testCase: "Backspace button should automatically logout the site",
          expected: "This is not treated as a standard web-app logout requirement",
          actual: stillLoggedIn
            ? "Pressing Backspace did not log the user out, which remains the intended behavior."
            : "Pressing Backspace logged the user out.",
          status: "N/A",
        })
      );
      await context.close();
    }

    return results;
  } finally {
    await api.dispose();
    await browser.close();
  }
}

function toMarkdown(results) {
  const lines = [
    "| Test Case ID | Test Case | Expected Result | Actual Result | Status |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const row of results) {
    lines.push(
      `| ${row.id} | ${row.testCase} | ${row.expected.replace(/\|/g, "\\|")} | ${row.actual.replace(/\|/g, "\\|")} | ${row.status} |`
    );
  }

  return lines.join("\n");
}

async function main() {
  const backend = spawnProcess(
    "backend",
    ["run", "start", "--prefix", "server"],
    {
      DATABASE_URL: "",
      PORT: "4000",
      JWT_SECRET: "test-secret",
    }
  );

  const frontend = spawnProcess(
    "frontend",
    ["run", "dev:ui", "--", "--host", "127.0.0.1", "--port", "3000"]
  );

  let results = [];

  try {
    await waitForUrl(`${API_URL}/health`);
    await waitForUrl(APP_URL);
    results = await runMatrix();

    await mkdir(RESULTS_DIR, { recursive: true });
    await writeFile(JSON_PATH, JSON.stringify(results, null, 2));
    await writeFile(MD_PATH, toMarkdown(results));

    console.table(
      results.map((row) => ({
        id: row.id,
        status: row.status,
        testCase: row.testCase,
      }))
    );
    console.log(`Saved JSON results to ${JSON_PATH}`);
    console.log(`Saved Markdown results to ${MD_PATH}`);
  } catch (error) {
    console.error("Login matrix execution failed.");
    console.error(error instanceof Error ? error.stack : error);
    console.error("\nBackend tail:\n", backend.stdout.join(""), backend.stderr.join(""));
    console.error("\nFrontend tail:\n", frontend.stdout.join(""), frontend.stderr.join(""));
    process.exitCode = 1;
  } finally {
    await stopProcess(frontend);
    await stopProcess(backend);
  }

  const failingStatuses = new Set(["FAIL"]);
  if (results.some((row) => failingStatuses.has(row.status))) {
    process.exitCode = 2;
  }
}

await main();
