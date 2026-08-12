/**
 * Tests for the syntax command
 * Verifies the printed reference stays in step with the agent registry and the
 * template placeholders, and that it survives its own expansion pass.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

import { syntaxMain } from "@/cli/commands/syntax/syntax.js";
import { AGENT_NAMES } from "@/cli/features/agentNames.js";
import {
  TEMPLATE_PLACEHOLDER_NAMES,
  expandAgentConditionals,
} from "@/cli/features/template.js";

describe("syntaxMain", () => {
  let written: Array<string>;

  beforeEach(() => {
    written = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const plainReference = async (): Promise<string> => {
    await syntaxMain();
    return written.join("");
  };

  it("should name every registered agent in the reference", async () => {
    const output = await plainReference();

    for (const name of AGENT_NAMES) {
      expect(output).toMatch(
        new RegExp(String.raw`(^|[^\w-])${name}([^\w-]|$)`),
      );
    }
  });

  it("should document every supported path placeholder", async () => {
    const output = await plainReference();

    for (const placeholder of TEMPLATE_PLACEHOLDER_NAMES) {
      expect(output).toContain(`{{${placeholder}}}`);
    }
  });

  it("should be a fixed point of its own expansion for every agent", async () => {
    const output = await plainReference();

    // The reference teaches conditional syntax by example. If those examples
    // are not protected, installing the reference into a skillset would eat
    // the very syntax it documents.
    for (const agentName of AGENT_NAMES) {
      expect(expandAgentConditionals({ agentName, content: output })).toBe(
        output,
      );
    }
  });

  it("should not teach a block section written on a single line", async () => {
    const output = await plainReference();

    // Block tags must each stand alone on their own line. An example that
    // opens and closes on one line documents a form the parser rejects.
    const offenders = output
      .split("\n")
      .filter((line) => /\{\{[#^][a-z]/.test(line) && /\{\{\//.test(line));
    expect(offenders).toEqual([]);
  });

  it("should print both conditional forms to stdout", async () => {
    const output = await plainReference();

    expect(output).toContain("{{claude-code TaskCreate}}");
    expect(output).toContain("{{#claude-code}}");
    expect(output).toContain("{{else}}");
    expect(output).toContain("{{/}}");
  });
});
