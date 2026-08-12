/**
 * Canonical agent names.
 *
 * This module must stay dependency-free: template.ts reads AGENT_NAMES at
 * runtime, and importing it from agentRegistry.ts would create an import
 * cycle (template -> agentRegistry -> agentTable -> loaders -> template).
 */

/**
 * Canonical agent names used as UIDs in the registry.
 * Each AgentConfig.name must match one of these values.
 */
export const AGENT_NAMES = [
  "claude-code",
  "cline",
  "codex",
  "cursor-agent",
  "droid",
  "gemini-cli",
  "github-copilot",
  "goose",
  "kilo",
  "kimi-cli",
  "opencode",
  "openclaw",
  "pi",
] as const;

export type AgentName = (typeof AGENT_NAMES)[number];
