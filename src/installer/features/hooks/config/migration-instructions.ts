#!/usr/bin/env node

/**
 * Hook handler for migration instructions
 *
 * This script is called by Claude Code SessionStart hook.
 * It checks for pending migrations and instructs users how to complete them.
 */

import * as fs from "fs";
import * as path from "path";

import { error } from "@/installer/logger.js";
import { getInstallDirs } from "@/utils/path.js";

import { formatError } from "./intercepted-slashcommands/format.js";

/**
 * Migration instruction interface
 * Each migration defines a trigger function that returns:
 * - A message string if migration is needed
 * - null if no migration is needed
 */
type MigrationInstruction = {
  trigger: (args: { installDir: string }) => string | null;
};

/**
 * Output hook result with systemMessage
 * @param args - Configuration arguments
 * @param args.message - Message to output
 */
const logToClaudeSession = (args: { message: string }): void => {
  const { message } = args;

  const output = {
    systemMessage: message,
  };

  console.log(JSON.stringify(output));
};

/**
 * Check if profiles exist in old .claude/profiles/ location
 * @param args - Configuration arguments
 * @param args.installDir - Installation directory
 *
 * @returns Migration message or null
 */
const checkOldProfilesLocation: MigrationInstruction = {
  trigger: (args: { installDir: string }): string | null => {
    const { installDir } = args;

    const oldProfilesDir = path.join(installDir, ".claude", "profiles");

    // Check if directory exists
    if (!fs.existsSync(oldProfilesDir)) {
      return null;
    }

    // Get directory entries, filtering out hidden files
    let entries: Array<string>;
    try {
      entries = fs
        .readdirSync(oldProfilesDir)
        .filter((entry) => !entry.startsWith("."));
    } catch {
      return null;
    }

    // Check if there are any non-hidden entries (profiles)
    if (entries.length === 0) {
      return null;
    }

    // Build migration message
    const newProfilesDir = path.join(installDir, ".nori", "profiles");
    let message = "⚠️ **Profile Migration Required**\n\n";
    message += `Found profiles in old location: ${oldProfilesDir}\n\n`;
    message += "**Profiles found:**\n";
    for (const entry of entries) {
      message += `- ${entry}\n`;
    }
    message += "\n**To migrate, move your profiles to the new location:**\n";
    message += `\`mv ${oldProfilesDir}/* ${newProfilesDir}/\`\n`;

    return message;
  },
};

/**
 * Dictionary of all migration instructions
 */
const migrationInstructions: Record<string, MigrationInstruction> = {
  oldProfilesLocation: checkOldProfilesLocation,
};

/**
 * Main entry point
 * @param args - Configuration arguments
 * @param args.installDir - Installation directory (optional, for testing)
 */
export const main = async (args?: {
  installDir?: string | null;
}): Promise<void> => {
  try {
    // Find installation directory - use provided value (for testing) or discover from cwd
    let installDir = args?.installDir;

    if (installDir == null) {
      const allInstallations = getInstallDirs({ currentDir: process.cwd() });
      if (allInstallations.length === 0) {
        return; // No installation found
      }
      installDir = allInstallations[0];
    }

    // Collect all triggered migration messages
    const messages: Array<string> = [];

    for (const [_name, instruction] of Object.entries(migrationInstructions)) {
      const message = instruction.trigger({ installDir });
      if (message != null) {
        messages.push(message);
      }
    }

    // Output combined message if any migrations are needed
    if (messages.length > 0) {
      const combinedMessage = messages.join("\n\n---\n\n");
      logToClaudeSession({
        message: formatError({ message: combinedMessage }),
      });
    }
  } catch (err) {
    // Silent failure - don't interrupt session startup
    error({
      message: `Migration instructions: Error (non-fatal): ${err}`,
    });
  }
};

// Export for testing
export { logToClaudeSession, migrationInstructions };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    error({
      message: `Migration instructions: Unhandled error (non-fatal): ${err}`,
    });
    process.exit(0); // Always exit 0 to not disrupt session
  });
}
