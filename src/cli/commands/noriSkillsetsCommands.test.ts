/**
 * Tests for nori-skillsets command registration.
 */

import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as installTracking from "@/cli/installTracking.js";

import {
  registerNoriSkillsetsUploadSkillCommand,
  registerNoriSkillsetsWatchCommand,
} from "./noriSkillsetsCommands.js";

vi.mock("@/cli/installTracking.js", () => ({
  trackWatchStarted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/cli/version.js", () => ({
  getCurrentPackageVersion: vi.fn().mockReturnValue("2.4.0"),
}));

vi.mock("@/cli/commands/watch/watch.js", () => ({
  watchMain: vi.fn().mockResolvedValue({
    success: true,
    cancelled: false,
    message: "watch started",
  }),
  watchStopMain: vi.fn().mockResolvedValue(undefined),
}));

const trackWatchStarted = (
  installTracking as unknown as {
    trackWatchStarted: ReturnType<typeof vi.fn>;
  }
).trackWatchStarted;

describe("registerNoriSkillsetsUploadSkillCommand", () => {
  const buildUploadSkillCommand = (): Command => {
    const program = new Command();
    // Mirror the real CLI, which registers a program-level version flag.
    program.version("9.9.9");
    registerNoriSkillsetsUploadSkillCommand({ program });
    const command = program.commands.find((c) => c.name() === "upload-skill");
    if (command == null) {
      throw new Error("upload-skill command was not registered");
    }
    return command;
  };

  it("does not define a --version option (it collides with the program's global --version; version is set via skill@version)", () => {
    const command = buildUploadSkillCommand();
    const longFlags = command.options.map((option) => option.long);
    expect(longFlags).not.toContain("--version");
  });

  it("still registers its real options", () => {
    const command = buildUploadSkillCommand();
    const longFlags = command.options.map((option) => option.long);
    expect(longFlags).toEqual(
      expect.arrayContaining([
        "--skillset",
        "--registry",
        "--public",
        "--description",
      ]),
    );
  });
});

describe("registerNoriSkillsetsWatchCommand analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not emit watch-started for watch stop", async () => {
    const program = new Command().exitOverride();
    registerNoriSkillsetsWatchCommand({ program });

    await program.parseAsync(["watch", "stop"], { from: "user" });

    expect(trackWatchStarted).not.toHaveBeenCalled();
  });
});
