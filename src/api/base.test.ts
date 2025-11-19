import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ConfigManager } from "./base.js";

describe("ConfigManager", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temp directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "config-manager-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Restore original CWD
    process.chdir(originalCwd);

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should return empty object when config file does not exist in CWD", () => {
    // No config file in tempDir (CWD)
    const result = ConfigManager.loadConfig();

    expect(result).toEqual({});
  });

  it("should load config from .nori-config.json in CWD", async () => {
    // Create config file in CWD
    const configPath = path.join(tempDir, ".nori-config.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        username: "test@example.com",
        password: "test123",
        organizationUrl: "https://example.com",
      }),
    );

    const result = ConfigManager.loadConfig();

    expect(result).toEqual({
      username: "test@example.com",
      password: "test123",
      organizationUrl: "https://example.com",
    });
  });

  // Race condition scenarios: these test cases cover situations where
  // analytics code calls loadConfig() before/during config file creation
  it("should return empty object when config file is empty (race condition)", async () => {
    // Simulates reading the file after creation but before write completes
    const configPath = path.join(tempDir, ".nori-config.json");
    await fs.writeFile(configPath, "");

    const result = ConfigManager.loadConfig();

    expect(result).toEqual({});
  });

  it("should return empty object when config file contains whitespace only (race condition)", async () => {
    // Simulates partial file write during race condition
    const configPath = path.join(tempDir, ".nori-config.json");
    await fs.writeFile(configPath, "   \n  \t  ");

    const result = ConfigManager.loadConfig();

    expect(result).toEqual({});
  });

  // Unexpected error scenarios: truly malformed content should still be caught
  it("should return empty object when config file contains invalid JSON", async () => {
    const configPath = path.join(tempDir, ".nori-config.json");
    await fs.writeFile(configPath, "{invalid json}");

    const result = ConfigManager.loadConfig();

    expect(result).toEqual({});
  });

  describe("isConfigured", () => {
    it("should return false when config file does not exist", () => {
      const result = ConfigManager.isConfigured();

      expect(result).toBe(false);
    });

    it("should return false when credentials are missing", async () => {
      const configPath = path.join(tempDir, ".nori-config.json");
      await fs.writeFile(
        configPath,
        JSON.stringify({
          profile: { baseProfile: "senior-swe" },
        }),
      );

      const result = ConfigManager.isConfigured();

      expect(result).toBe(false);
    });

    it("should return true when all credentials are present", async () => {
      const configPath = path.join(tempDir, ".nori-config.json");
      await fs.writeFile(
        configPath,
        JSON.stringify({
          username: "test@example.com",
          password: "test123",
          organizationUrl: "https://example.com",
        }),
      );

      const result = ConfigManager.isConfigured();

      expect(result).toBe(true);
    });
  });
});
