/**
 * Syntax Command
 *
 * Prints the template syntax reference for skillset authors and agents.
 */

import { AGENT_NAMES } from "@/cli/features/agentNames.js";
import { TEMPLATE_PLACEHOLDER_NAMES } from "@/cli/features/template.js";

import type { CommandStatus } from "@/cli/commands/commandStatus.js";

const FENCE = "```";

/**
 * Build the reference text.
 *
 * Every conditional example lives inside a fenced code block, which agent
 * conditional expansion skips, so this reference survives being shipped inside
 * a skillset.
 *
 * @returns The template syntax reference
 */
const buildReference = (): string =>
  [
    "Agent conditionals keep only the content that applies to the agent being",
    "installed for. Everything else is removed.",
    "",
    "Inline — swap a word or a short phrase:",
    "",
    FENCE,
    "use the {{claude-code TaskCreate}}{{codex update_plan}}{{else your plan tool}} tool",
    FENCE,
    "",
    "Adjacent tags form one choice. The first match wins, {{else}} is the",
    "fallback, and the surrounding spacing is cleaned up when nothing matches.",
    "Inline payloads cannot contain braces — use the block form for those.",
    "",
    "Block — multi-line content:",
    "",
    FENCE,
    "{{#claude-code}}",
    "Track work with TaskCreate.",
    "{{else codex}}",
    "Track work with update_plan.",
    "{{else}}",
    "Track work with your plan tool.",
    "{{/}}",
    FENCE,
    "",
    "Close with {{/}} or the explicit {{/claude-code}}. Tag lines are removed",
    "entirely, so no blank line is left behind. Sections may nest.",
    "",
    "List several agents with commas, and negate with ^. Both forms accept",
    "either, so a one-liner uses the inline form:",
    "",
    FENCE,
    "{{claude-code,codex Applies to both.}}",
    "{{^codex Applies to everyone except codex.}}",
    FENCE,
    "",
    "Block tags must each sit alone on their own line — a section cannot be",
    "opened and closed on one line.",
    "",
    `Agent names: ${AGENT_NAMES.join(", ")}.`,
    "",
    "Tags naming anything else are left alone, so ${{ github.sha }} and other",
    "brace syntax passes through untouched.",
    "",
    "Path placeholders, substituted at install time:",
    "",
    FENCE,
    ...TEMPLATE_PLACEHOLDER_NAMES.map((name) => `{{${name}}}`),
    FENCE,
    "",
    "Wrap a placeholder or tag in backticks to keep it literal.",
  ].join("\n");

/**
 * Main function for the syntax command
 *
 * The reference is always written as plain text: it is a block of markdown
 * meant to be read or piped, not a prompt result to frame.
 *
 * @returns Command status
 */
export const syntaxMain = async (): Promise<CommandStatus> => {
  process.stdout.write(buildReference() + "\n");

  return {
    success: true,
    cancelled: false,
    message: "Printed template syntax reference",
  };
};
