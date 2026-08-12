/**
 * Shared collector for template authoring warnings
 *
 * Loaders process many files per run, so warnings are gathered with the file
 * that produced them and reported once at the end rather than one clack line
 * per file.
 */

import { log } from "@clack/prompts";

export type TemplateWarningCollector = {
  for: (args: { relativePath: string }) => (args: { message: string }) => void;
  report: () => void;
};

/**
 * Create a warning collector for a single loader run.
 *
 * @returns A collector exposing a per-file warning sink and a report function
 */
export const createTemplateWarningCollector = (): TemplateWarningCollector => {
  const messages: Array<string> = [];

  return {
    for: (args: { relativePath: string }) => (warning: { message: string }) => {
      messages.push(`${args.relativePath}: ${warning.message}`);
    },
    report: () => {
      const unique = Array.from(new Set(messages));
      if (unique.length > 0) {
        log.warn(`Template issues found:\n${unique.join("\n")}`);
      }
    },
  };
};
