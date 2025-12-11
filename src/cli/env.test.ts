/**
 * Tests for environment constants
 */

import * as path from "path";

import { describe, it, expect } from "vitest";

import { MCP_ROOT } from "./env.js";

describe("MCP_ROOT", () => {
  it("should be an absolute path", () => {
    expect(path.isAbsolute(MCP_ROOT)).toBe(true);
  });

  it("should point to the package root directory", () => {
    // MCP_ROOT should be the directory containing package.json
    // It should be 3 levels up from src/cli/env.ts -> ../../.. -> root
    expect(MCP_ROOT).toContain("nori-profiles");
  });

  it("should not contain src directory", () => {
    // The root should not end with src or any subdirectory
    expect(MCP_ROOT.endsWith("/src")).toBe(false);
    expect(MCP_ROOT.endsWith("/cli")).toBe(false);
  });
});
