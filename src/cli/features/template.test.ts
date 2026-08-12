/**
 * Tests for template substitution
 */

import * as os from "os";
import * as path from "path";

import { describe, it, expect } from "vitest";

import {
  expandAgentConditionals,
  substituteTemplatePaths,
} from "@/cli/features/template.js";

describe("substituteTemplatePaths", () => {
  describe("skills_dir placeholder", () => {
    it("should replace {{skills_dir}} with absolute path", () => {
      const content = "Read `{{skills_dir}}/using-skills/SKILL.md`";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe(
        "Read `/project/.claude/skills/using-skills/SKILL.md`",
      );
    });

    it("should replace multiple {{skills_dir}} placeholders", () => {
      const content = `
- Read \`{{skills_dir}}/foo/SKILL.md\`
- Read \`{{skills_dir}}/bar/SKILL.md\`
`;
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toContain("/project/.claude/skills/foo/SKILL.md");
      expect(result).toContain("/project/.claude/skills/bar/SKILL.md");
    });
  });

  describe("profiles_dir placeholder", () => {
    it("should replace {{profiles_dir}} with ~/.nori/profiles regardless of installDir", () => {
      const content = "Check `{{profiles_dir}}/amol/CLAUDE.md`";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      // Profiles are always in ~/.nori/profiles
      const expectedProfilesDir = path.join(os.homedir(), ".nori", "profiles");
      expect(result).toBe(`Check \`${expectedProfilesDir}/amol/CLAUDE.md\``);
    });
  });

  describe("commands_dir placeholder", () => {
    it("should replace {{commands_dir}} with absolute path", () => {
      const content = "See `{{commands_dir}}/nori-init-docs.md`";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe("See `/project/.claude/commands/nori-init-docs.md`");
    });

    it("should allow overriding skills and commands directories", () => {
      const content = "Skills: {{skills_dir}} Commands: {{commands_dir}}";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.pi",
        skillsDir: "/project/.pi/agent/skills",
        commandsDir: "/project/.pi/commands",
      });
      expect(result).toBe(
        "Skills: /project/.pi/agent/skills Commands: /project/.pi/commands",
      );
    });
  });

  describe("install_dir placeholder", () => {
    it("should replace {{install_dir}} with parent of installDir", () => {
      const content = "Config at `{{install_dir}}/.nori-config.json`";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe("Config at `/project/.nori-config.json`");
    });
  });

  describe("mixed placeholders", () => {
    it("should replace all placeholders in one pass", () => {
      const content = `
Read {{skills_dir}}/foo/SKILL.md
Check {{profiles_dir}}/bar
Commands at {{commands_dir}}
Install root: {{install_dir}}
`;
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      const expectedProfilesDir = path.join(os.homedir(), ".nori", "profiles");
      expect(result).toContain("/project/.claude/skills/foo/SKILL.md");
      // Profiles are always in ~/.nori/profiles
      expect(result).toContain(`${expectedProfilesDir}/bar`);
      expect(result).toContain("/project/.claude/commands");
      expect(result).toContain("Install root: /project");
    });
  });

  describe("edge cases", () => {
    it("should handle content with no placeholders", () => {
      const content = "No placeholders here";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe("No placeholders here");
    });

    it("should handle empty content", () => {
      const result = substituteTemplatePaths({
        content: "",
        installDir: "/project/.claude",
      });
      expect(result).toBe("");
    });

    it("should handle home directory install", () => {
      const content = "Skills at {{skills_dir}}";
      const result = substituteTemplatePaths({
        content,
        installDir: "/home/user/.claude",
      });
      expect(result).toBe("Skills at /home/user/.claude/skills");
    });
  });

  describe("escaped variables (backtick-wrapped)", () => {
    it("should not substitute variables wrapped in backticks", () => {
      const content = "Use `{{skills_dir}}` in your skill content";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe("Use `{{skills_dir}}` in your skill content");
    });

    it("should substitute unescaped but preserve escaped in same content", () => {
      const content =
        "Skills at {{skills_dir}}, document `{{skills_dir}}` as variable";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe(
        "Skills at /project/.claude/skills, document `{{skills_dir}}` as variable",
      );
    });

    it("should handle multiple escaped variables", () => {
      const content =
        "Use `{{skills_dir}}` and `{{install_dir}}` in your content";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe(
        "Use `{{skills_dir}}` and `{{install_dir}}` in your content",
      );
    });

    it("should handle escaped variables with surrounding text", () => {
      const content = `
These variables are automatically substituted:
- \`{{skills_dir}}\` → actual path to skills directory
- \`{{install_dir}}\` → actual install directory

Example: {{skills_dir}}/my-skill/SKILL.md
`;
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toContain("`{{skills_dir}}`");
      expect(result).toContain("`{{install_dir}}`");
      expect(result).toContain("/project/.claude/skills/my-skill/SKILL.md");
    });

    it("should preserve unknown escaped variables", () => {
      const content = "Use `{{unknown_var}}` for something";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe("Use `{{unknown_var}}` for something");
    });
  });

  describe("agent conditionals", () => {
    it("should substitute paths inside a kept block", () => {
      const content =
        "{{#claude-code}}\nRead {{skills_dir}}/x/SKILL.md\n{{/}}\n";
      const result = substituteTemplatePaths({
        agentName: "claude-code",
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe("Read /project/.claude/skills/x/SKILL.md\n");
    });

    it("should leave nothing behind when a block is dropped", () => {
      const content =
        "{{#claude-code}}\nRead {{skills_dir}}/x/SKILL.md\n{{/}}\n";
      const result = substituteTemplatePaths({
        agentName: "codex",
        content,
        installDir: "/project/.codex",
      });
      expect(result).toBe("");
    });

    it("should leave conditionals untouched when no agent is given", () => {
      const content = "use the {{claude-code TaskCreate}} tool";
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toBe("use the {{claude-code TaskCreate}} tool");
    });
  });

  describe("fenced code blocks", () => {
    it("should still substitute path placeholders inside a fenced block", () => {
      // Published skillsets put runnable commands in fences and rely on the
      // path being real. Backticks remain the opt-out.
      const content = [
        "```bash",
        "node {{skills_dir}}/my-skill/script.js",
        "```",
        "",
      ].join("\n");
      const result = substituteTemplatePaths({
        content,
        installDir: "/project/.claude",
      });
      expect(result).toContain(
        "node /project/.claude/skills/my-skill/script.js",
      );
    });

    it("should not expand agent conditionals inside a fenced block", () => {
      const content = [
        "Syntax:",
        "```markdown",
        "{{#claude-code}}",
        "Use TaskCreate.",
        "{{/}}",
        "```",
        "",
      ].join("\n");
      const result = substituteTemplatePaths({
        agentName: "codex",
        content,
        installDir: "/project/.codex",
      });
      expect(result).toBe(content);
    });

    it("should treat everything after an unclosed fence as fenced", () => {
      const content = [
        "```",
        "{{codex still fenced}}",
        "and so is this",
        "",
      ].join("\n");
      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe(content);
    });

    it("should resume expanding after a fenced block closes", () => {
      const content = [
        "```",
        "{{claude-code fenced}}",
        "```",
        "{{claude-code live}}",
        "",
      ].join("\n");
      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe(["```", "{{claude-code fenced}}", "```", "live", ""].join("\n"));
    });

    it("should not let a tilde line close a backtick fence", () => {
      const content = [
        "```",
        "~~~",
        "{{claude-code still fenced}}",
        "```",
        "{{claude-code live}}",
        "",
      ].join("\n");
      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe(
        ["```", "~~~", "{{claude-code still fenced}}", "```", "live", ""].join(
          "\n",
        ),
      );
    });

    it("should not let a shorter inner fence close a longer outer fence", () => {
      const content = [
        "````",
        "```js",
        "x",
        "```",
        "{{claude-code still fenced}}",
        "````",
        "{{claude-code live}}",
        "",
      ].join("\n");
      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe(
        [
          "````",
          "```js",
          "x",
          "```",
          "{{claude-code still fenced}}",
          "````",
          "live",
          "",
        ].join("\n"),
      );
    });

    it("should keep a fenced code block inside a conditional section", () => {
      const content = [
        "{{#codex}}",
        "Run this:",
        "```bash",
        "echo hi",
        "```",
        "Done.",
        "{{/}}",
        "",
      ].join("\n");

      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        ["Run this:", "```bash", "echo hi", "```", "Done.", ""].join("\n"),
      );
      expect(expandAgentConditionals({ agentName: "goose", content })).toBe("");
    });

    it("should not leak an excluded section that wraps a fence", () => {
      const content = [
        "{{^claude-code}}",
        "Hidden from claude-code.",
        "```",
        "code",
        "```",
        "{{/}}",
        "",
      ].join("\n");

      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe("");
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        ["Hidden from claude-code.", "```", "code", "```", ""].join("\n"),
      );
    });

    it("should not expand a backtick-escaped conditional tag", () => {
      const content = "Write `{{claude-code TaskCreate}}` to swap the name.\n";
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        content,
      );
    });
  });
});

describe("expandAgentConditionals", () => {
  describe("inline form", () => {
    it("should select the payload matching the active agent", () => {
      const content =
        "use the {{claude-code TaskCreate}}{{codex update_plan}} tool";
      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe("use the TaskCreate tool");
    });

    it("should collapse the leading space when nothing matches", () => {
      const content =
        "use the {{claude-code TaskCreate}}{{codex update_plan}} tool";
      expect(expandAgentConditionals({ agentName: "goose", content })).toBe(
        "use the tool",
      );
    });

    it("should fall back to an else branch bound to the preceding run", () => {
      const content =
        "use the {{claude-code TaskCreate}}{{codex update_plan}}{{else your plan tool}} now";
      expect(expandAgentConditionals({ agentName: "goose", content })).toBe(
        "use the your plan tool now",
      );
    });

    it("should match any agent in a comma list", () => {
      const content = "run {{claude-code,codex Bash}}{{else shell}} here";
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        "run Bash here",
      );
    });

    it("should resolve a comma list or a negation on a line of its own", () => {
      expect(
        expandAgentConditionals({
          agentName: "codex",
          content: "{{claude-code,codex Applies to both.}}\n",
        }),
      ).toBe("Applies to both.\n");
      expect(
        expandAgentConditionals({
          agentName: "goose",
          content: "{{^codex Applies to everyone except codex.}}\n",
        }),
      ).toBe("Applies to everyone except codex.\n");
    });

    it("should keep a negated payload for a non-listed agent", () => {
      const content = "note {{^codex applies to you}} end";
      expect(expandAgentConditionals({ agentName: "goose", content })).toBe(
        "note applies to you end",
      );
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        "note end",
      );
    });

    it("should warn and not join a non-contiguous else to an earlier run", () => {
      const warnings: Array<string> = [];
      const content = "use {{claude-code A}} and then {{else B}} done";
      const result = expandAgentConditionals({
        agentName: "codex",
        content,
        onWarning: ({ message }) => warnings.push(message),
      });

      expect(result).toBe("use and then {{else B}} done");
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("else");
    });
  });

  describe("block form", () => {
    it("should keep the matching branch of an else chain", () => {
      const content = [
        "Intro.",
        "{{#claude-code}}",
        "Use TaskCreate.",
        "{{else codex}}",
        "Use update_plan.",
        "{{else}}",
        "Use your plan tool.",
        "{{/}}",
        "Outro.",
        "",
      ].join("\n");

      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        "Intro.\nUse update_plan.\nOutro.\n",
      );
      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe("Intro.\nUse TaskCreate.\nOutro.\n");
      expect(expandAgentConditionals({ agentName: "goose", content })).toBe(
        "Intro.\nUse your plan tool.\nOutro.\n",
      );
    });

    it("should remove tag lines without leaving blank lines behind", () => {
      const content = ["A", "{{#codex}}", "B", "{{/codex}}", "C", ""].join(
        "\n",
      );
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        "A\nB\nC\n",
      );
      expect(expandAgentConditionals({ agentName: "goose", content })).toBe(
        "A\nC\n",
      );
    });

    it("should warn when a named closing tag does not match its section", () => {
      const warnings: Array<string> = [];
      const content = "{{#codex}}\nA\n{{/claude-code}}\n";
      const result = expandAgentConditionals({
        agentName: "codex",
        content,
        onWarning: ({ message }) => warnings.push(message),
      });

      expect(result).toBe("A\n");
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("claude-code");
      expect(warnings[0]).toContain("codex");
    });

    it("should not warn when a named closing tag matches its section", () => {
      const warnings: Array<string> = [];
      expandAgentConditionals({
        agentName: "codex",
        content: "{{^claude-code,codex}}\nA\n{{/claude-code,codex}}\n",
        onWarning: ({ message }) => warnings.push(message),
      });
      expect(warnings).toEqual([]);
    });

    it("should bind an inner else to its own section", () => {
      const content = [
        "{{#claude-code,codex}}",
        "shared",
        "{{#codex}}",
        "codex only",
        "{{else}}",
        "not codex",
        "{{/}}",
        "{{/}}",
        "",
      ].join("\n");

      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        "shared\ncodex only\n",
      );
      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe("shared\nnot codex\n");
      expect(expandAgentConditionals({ agentName: "goose", content })).toBe("");
    });

    it("should keep an inline conditional that sits within a kept block", () => {
      const content = [
        "{{#claude-code,codex}}",
        "call {{claude-code TaskCreate}}{{codex update_plan}} first",
        "{{/}}",
        "",
      ].join("\n");
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        "call update_plan first\n",
      );
    });

    it("should handle CRLF line endings", () => {
      const content = "A\r\n{{#codex}}\r\nB\r\n{{/}}\r\nC\r\n";
      expect(expandAgentConditionals({ agentName: "goose", content })).toBe(
        "A\r\nC\r\n",
      );
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        "A\r\nB\r\nC\r\n",
      );
    });

    it("should warn and leave an unclosed section as literal text", () => {
      const warnings: Array<string> = [];
      const content = "A\n{{#codex}}\nB\n";
      const result = expandAgentConditionals({
        agentName: "codex",
        content,
        onWarning: ({ message }) => warnings.push(message),
      });

      expect(result).toBe("A\n{{#codex}}\nB\n");
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("codex");
    });

    it("should leave an unclosed negated section as literal text", () => {
      // The reconstructed opener must not then be eaten by the inline pass,
      // which would leak content away from its exclusion.
      const content = "{{^claude-code}}\nHidden from claude-code.\n";
      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe(content);
    });
  });

  describe("pass-through safety", () => {
    it("should not touch braces that do not name an agent", () => {
      const content = "- run: echo ${{ github.sha }}\nvalue: {{ env.FOO }}\n";
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        content,
      );
    });

    it("should not touch the existing path placeholders", () => {
      const content = "Read {{skills_dir}}/x and {{install_dir}}/y";
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        content,
      );
    });

    it("should not let an unterminated inline tag swallow later lines", () => {
      const content =
        "Note: {{codex \nSome paragraph.\n\nAnother with a}} brace.\nTail.\n";
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        content,
      );
    });

    it("should not touch an agent name used as a bare variable", () => {
      const content = "{{pi}} is roughly 3.14 and {{goose}} is a bird.";
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        content,
      );
    });

    it("should not touch prose that merely looks like an inline tag", () => {
      const content = "Fill in {{note the reviewer name here}} before sending.";
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        content,
      );
    });

    it("should leave a block whose name is not an agent as literal text", () => {
      const content = "{{#clau-code}}\nA\n{{/}}\n";
      expect(expandAgentConditionals({ agentName: "codex", content })).toBe(
        content,
      );
      expect(
        expandAgentConditionals({ agentName: "claude-code", content }),
      ).toBe(content);
    });

    it("should return content unchanged when no agent is given", () => {
      const content = "{{#codex}}\nB\n{{/}}\nuse {{claude-code TaskCreate}}\n";
      expect(expandAgentConditionals({ agentName: null, content })).toBe(
        content,
      );
    });
  });

  describe("warnings", () => {
    it("should warn and pass through a misspelled agent name", () => {
      const warnings: Array<string> = [];
      const content = "use the {{claude_code TaskCreate}} tool";
      const result = expandAgentConditionals({
        agentName: "claude-code",
        content,
        onWarning: ({ message }) => warnings.push(message),
      });

      expect(result).toBe("use the {{claude_code TaskCreate}} tool");
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("claude_code");
      expect(warnings[0]).toContain("claude-code");
    });

    it("should not warn about braces unrelated to agents", () => {
      const warnings: Array<string> = [];
      expandAgentConditionals({
        agentName: "codex",
        content: [
          "- run: echo ${{ github.sha }}",
          "Fill in {{note the reviewer name}} before sending.",
          "{{range .Items}}",
        ].join("\n"),
        onWarning: ({ message }) => warnings.push(message),
      });
      expect(warnings).toEqual([]);
    });

    it("should warn when a multi-branch choice resolves to nothing", () => {
      const warnings: Array<string> = [];
      const content = [
        "{{#claude-code}}",
        "A",
        "{{else codex}}",
        "B",
        "{{/}}",
        "",
      ].join("\n");
      expandAgentConditionals({
        agentName: "goose",
        content,
        onWarning: ({ message }) => warnings.push(message),
      });
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("goose");
    });

    it("should not warn when a single-agent section is intentionally excluded", () => {
      const warnings: Array<string> = [];
      expandAgentConditionals({
        agentName: "goose",
        content: "{{#claude-code}}\nA\n{{/}}\n",
        onWarning: ({ message }) => warnings.push(message),
      });
      expect(warnings).toEqual([]);
    });

    it("should not warn when a multi-branch choice has an else", () => {
      const warnings: Array<string> = [];
      const content = [
        "{{#claude-code}}",
        "A",
        "{{else codex}}",
        "B",
        "{{else}}",
        "C",
        "{{/}}",
        "",
      ].join("\n");
      expandAgentConditionals({
        agentName: "goose",
        content,
        onWarning: ({ message }) => warnings.push(message),
      });
      expect(warnings).toEqual([]);
    });
  });
});
