/**
 * List skillsets command for Nori Skillsets CLI
 * Lists locally available skillsets for programmatic use
 */

import { log } from "@clack/prompts";

import { exitAfterAnalyticsFailure } from "@/cli/installTracking.js";
import { listSkillsetsWithMetadata } from "@/norijson/skillset.js";

import type { Command } from "commander";

/**
 * Main function for list-skillsets command
 *
 * @returns Resolves after writing the installed skillsets or exiting with failure
 */
export const listSkillsetsMain = async (): Promise<void> => {
  // Get and output skillsets - one per line for easy parsing
  // Skillsets are always loaded from ~/.nori/profiles/
  const skillsets = await listSkillsetsWithMetadata();

  if (skillsets.length === 0) {
    log.error("No skillsets installed.");
    return exitAfterAnalyticsFailure();
  }

  // Output raw lines for scripting
  for (const entry of skillsets) {
    const suffix = entry.isLinked ? " (linked)" : "";
    process.stdout.write(entry.name + suffix + "\n");
  }
};

/**
 * Register the 'list-skillsets' command with commander
 * @param args - Configuration arguments
 * @param args.program - Commander program instance
 */
export const registerListSkillsetsCommand = (args: {
  program: Command;
}): void => {
  const { program } = args;

  program
    .command("list-skillsets")
    .description("List locally available skillsets (one per line)")
    .action(async () => {
      await listSkillsetsMain();
    });
};
