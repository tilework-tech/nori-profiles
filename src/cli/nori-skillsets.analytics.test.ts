import { execFile, execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { createServer, type Server } from "node:http";
import * as path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("build/src/cli/nori-skillsets.js");

type CapturedRequest = {
  authorization?: string;
  body: Record<string, unknown>;
};

describe("built CLI product analytics", () => {
  let homeDir: string;
  let server: Server;
  let analyticsUrl: string;
  let captured: Array<CapturedRequest>;

  beforeAll(() => {
    execFileSync("npm", ["run", "build"], { stdio: "pipe" });
  });

  beforeEach(async () => {
    homeDir = await fs.mkdtemp("/tmp/nori-skillsets-cli-analytics-");
    captured = [];
    server = createServer((request, response) => {
      const chunks: Array<Buffer> = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        captured.push({
          authorization: request.headers.authorization,
          body: JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
            string,
            unknown
          >,
        });
        response.writeHead(202, { "Content-Type": "application/json" });
        response.end('{"accepted":true}');
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (address == null || typeof address === "string") {
      throw new Error("analytics test server did not bind a TCP port");
    }
    analyticsUrl = `http://127.0.0.1:${address.port}/api/analytics/v1/events`;

    await fs.mkdir(path.join(homeDir, ".nori", "profiles"), {
      recursive: true,
    });
    const profileDir = path.join(
      homeDir,
      ".nori",
      "profiles",
      "personal",
      "analytics-test",
    );
    await fs.mkdir(profileDir, { recursive: true });
    await fs.writeFile(
      path.join(profileDir, "nori.json"),
      JSON.stringify({ name: "analytics-test", version: "1.0.0" }),
    );
    await fs.writeFile(
      path.join(profileDir, "AGENTS.md"),
      "# Analytics test\n",
    );
    await fs.writeFile(
      path.join(homeDir, ".nori-config.json"),
      JSON.stringify({
        installDir: path.join(homeDir, ".claude"),
        auth: {
          username: "user@example.com",
          organizationUrl: "https://acme.noriskillsets.dev",
          idToken: "firebase-id-token",
          idTokenExpiresAt: Date.now() + 60_000,
        },
      }),
    );
    const now = new Date().toISOString();
    await fs.writeFile(
      path.join(homeDir, ".nori", "profiles", ".nori-install.json"),
      JSON.stringify({
        schema_version: 1,
        client_id: "c4f24cc9-acde-4d20-87e1-1d6bfa8e7a67",
        opt_out: false,
        first_installed_at: now,
        last_updated_at: now,
        last_launched_at: now,
        installed_version: "0.0.0",
        install_source: "npm",
      }),
    );
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error == null ? resolve() : reject(error)));
    });
    await fs.rm(homeDir, { recursive: true, force: true });
  });

  const runCli = async (args: Array<string>, url = analyticsUrl) =>
    execFileAsync(process.execPath, [cliPath, ...args], {
      env: {
        ...process.env,
        CI: "1",
        FORCE_COLOR: "0",
        HOME: homeDir,
        NORI_GLOBAL_CONFIG: homeDir,
        NORI_ANALYTICS_URL: url,
      },
      timeout: 3_000,
    });

  it("reports a canonical successful command after preserving CLI output", async () => {
    const result = await runCli(["--silent", "list-agents"]);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("claude-code");
    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual({
      authorization: "Bearer firebase-id-token",
      body: expect.objectContaining({
        event: "skillsets_command_completed",
        properties: { command: "list-agents", result: "success" },
      }),
    });
    expect(JSON.stringify(captured[0])).not.toContain("--silent");
  });

  it("emits one first-install lifecycle when that launch performs an explicit install", async () => {
    await fs.rm(path.join(homeDir, ".nori", "profiles", ".nori-install.json"));

    await runCli([
      "--silent",
      "--non-interactive",
      "install",
      "personal/analytics-test",
    ]);

    const lifecycle = captured.filter(({ body }) =>
      String(body.event).startsWith("skillsets_install_"),
    );
    expect(lifecycle).toHaveLength(2);
    expect(lifecycle[0]?.body).toEqual(
      expect.objectContaining({
        event: "skillsets_install_started",
        properties: { install_kind: "first_install" },
      }),
    );
    expect(lifecycle[1]?.body).toEqual(
      expect.objectContaining({
        event: "skillsets_install_completed",
        activity_id: lifecycle[0]?.body.activity_id,
        properties: { install_kind: "first_install", result: "success" },
      }),
    );
  });

  it("does not report excluded informational commands", async () => {
    const result = await runCli(["--version"]);

    expect(result.stdout.trim()).toBe("0.0.0");
    expect(result.stderr).toBe("");
    expect(captured).toEqual([]);
  });

  it("maps a hidden Commander alias to its canonical allowlisted name", async () => {
    await runCli(["--silent", "list-skillsets"]);

    expect(captured).toHaveLength(1);
    expect(captured[0]?.body).toEqual(
      expect.objectContaining({
        event: "skillsets_command_completed",
        properties: { command: "list", result: "success" },
      }),
    );
    expect(JSON.stringify(captured[0])).not.toContain(
      '"command":"list-skillsets"',
    );
  });

  it("reports a canonical failure without replacing the CLI exit failure", async () => {
    let failure: unknown;
    try {
      await runCli([
        "--silent",
        "--non-interactive",
        "factory-reset",
        "definitely-not-an-agent",
      ]);
    } catch (error) {
      failure = error;
    }

    expect(failure).toEqual(
      expect.objectContaining({
        code: expect.any(Number),
      }),
    );
    expect(captured).toHaveLength(1);
    expect(captured[0]?.body).toEqual(
      expect.objectContaining({
        event: "skillsets_command_completed",
        properties: { command: "factory-reset", result: "failure" },
      }),
    );
  });

  it("reports a direct-command failure before its explicit process exit", async () => {
    let failure: unknown;
    try {
      await runCli(["--silent", "current"]);
    } catch (error) {
      failure = error;
    }

    expect(failure).toEqual(
      expect.objectContaining({ code: expect.any(Number) }),
    );
    expect(captured).toHaveLength(1);
    expect(captured[0]?.body).toEqual(
      expect.objectContaining({
        event: "skillsets_command_completed",
        properties: { command: "current", result: "failure" },
      }),
    );
  });

  it("preserves output and exit status when analytics is unavailable", async () => {
    const available = await runCli(["--silent", "list-agents"]);
    const unavailable = await runCli(
      ["--silent", "list-agents"],
      "http://127.0.0.1:1/api/analytics/v1/events",
    );

    expect(unavailable.stdout).toBe(available.stdout);
    expect(unavailable.stderr).toBe(available.stderr);
  });
});
