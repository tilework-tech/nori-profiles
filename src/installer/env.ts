/**
 * Environment paths and constants for installer
 * Centralized location for Claude-related paths
 */

import * as path from "path";
import { fileURLToPath } from "url";

import { normalizeInstallDir } from "@/utils/path.js";

/**
 * MCP root directory (where package.json is located)
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const MCP_ROOT = path.resolve(__dirname, "../../..");

/**
 * Get the Claude directory path
 * @param args - Configuration arguments
 * @param args.installDir - Custom installation directory (optional)
 *
 * @returns Absolute path to the .claude directory
 */
export const getClaudeDir = (args: { installDir?: string | null }): string => {
  return normalizeInstallDir(args);
};

/**
 * Get the Claude settings file path
 * @param args - Configuration arguments
 * @param args.installDir - Custom installation directory (optional)
 *
 * @returns Absolute path to settings.json
 */
export const getClaudeSettingsFile = (args: {
  installDir?: string | null;
}): string => {
  return path.join(getClaudeDir(args), "settings.json");
};

/**
 * Get the Claude agents directory path
 * @param args - Configuration arguments
 * @param args.installDir - Custom installation directory (optional)
 *
 * @returns Absolute path to the agents directory
 */
export const getClaudeAgentsDir = (args: {
  installDir?: string | null;
}): string => {
  return path.join(getClaudeDir(args), "agents");
};

/**
 * Get the Claude commands directory path
 * @param args - Configuration arguments
 * @param args.installDir - Custom installation directory (optional)
 *
 * @returns Absolute path to the commands directory
 */
export const getClaudeCommandsDir = (args: {
  installDir?: string | null;
}): string => {
  return path.join(getClaudeDir(args), "commands");
};

/**
 * Get the CLAUDE.md file path
 * @param args - Configuration arguments
 * @param args.installDir - Custom installation directory (optional)
 *
 * @returns Absolute path to CLAUDE.md
 */
export const getClaudeMdFile = (args: {
  installDir?: string | null;
}): string => {
  return path.join(getClaudeDir(args), "CLAUDE.md");
};

/**
 * Get the Claude skills directory path
 * @param args - Configuration arguments
 * @param args.installDir - Custom installation directory (optional)
 *
 * @returns Absolute path to the skills directory
 */
export const getClaudeSkillsDir = (args: {
  installDir?: string | null;
}): string => {
  return path.join(getClaudeDir(args), "skills");
};

/**
 * Get the Claude profiles directory path
 * @param args - Configuration arguments
 * @param args.installDir - Custom installation directory (optional)
 *
 * @returns Absolute path to the profiles directory
 */
export const getClaudeProfilesDir = (args: {
  installDir?: string | null;
}): string => {
  return path.join(getClaudeDir(args), "profiles");
};

// Backward-compatible constant exports (deprecated)
// These will be removed once all usages are migrated to functions
/** @deprecated Use getClaudeDir() instead */
export const CLAUDE_DIR = path.join(process.env.HOME || "~", ".claude");
/** @deprecated Use getClaudeSettingsFile() instead */
export const CLAUDE_SETTINGS_FILE = path.join(CLAUDE_DIR, "settings.json");
/** @deprecated Use getClaudeAgentsDir() instead */
export const CLAUDE_AGENTS_DIR = path.join(CLAUDE_DIR, "agents");
/** @deprecated Use getClaudeCommandsDir() instead */
export const CLAUDE_COMMANDS_DIR = path.join(CLAUDE_DIR, "commands");
/** @deprecated Use getClaudeMdFile() instead */
export const CLAUDE_MD_FILE = path.join(CLAUDE_DIR, "CLAUDE.md");
/** @deprecated Use getClaudeSkillsDir() instead */
export const CLAUDE_SKILLS_DIR = path.join(CLAUDE_DIR, "skills");
/** @deprecated Use getClaudeProfilesDir() instead */
export const CLAUDE_PROFILES_DIR = path.join(CLAUDE_DIR, "profiles");
