/**
 * Tests for environment constants
 */

import * as fs from "fs";
import * as path from "path";

import { describe, it, expect } from "vitest";

import { CLI_ROOT } from "./env.js";

describe("CLI_ROOT", () => {
  it("should be an absolute path", () => {
    expect(path.isAbsolute(CLI_ROOT)).toBe(true);
  });

  it("should point to the package root directory", () => {
    // CLI_ROOT should be the directory containing package.json with name "nori-ai"
    const packageJsonPath = path.join(CLI_ROOT, "package.json");
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    expect(packageJson.name).toBe("nori-ai");
  });

  it("should not contain src directory", () => {
    // The root should not end with src or any subdirectory
    expect(CLI_ROOT.endsWith("/src")).toBe(false);
    expect(CLI_ROOT.endsWith("/cli")).toBe(false);
  });
});
