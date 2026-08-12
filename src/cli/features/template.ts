/**
 * Template substitution utility
 * Placeholder replacement and agent-conditional expansion for skillset content
 */

import * as path from "path";

import { AGENT_NAMES } from "@/cli/features/agentNames.js";
import { getNoriSkillsetsDir } from "@/norijson/skillset.js";

import type { AgentName } from "@/cli/features/agentNames.js";

/** Path placeholders recognised in skillset markdown. */
export const TEMPLATE_PLACEHOLDER_NAMES = [
  "skills_dir",
  "profiles_dir",
  "commands_dir",
  "install_dir",
] as const;

type TemplateWarning = (args: { message: string }) => void;

const AGENT_NAME_SET: ReadonlySet<string> = new Set(AGENT_NAMES);

const NAME = "[A-Za-z][A-Za-z0-9_.-]*";
const NAME_LIST = `${NAME}(?:,${NAME})*`;

const OPEN_TAG = new RegExp(`^\\{\\{([#^])(${NAME_LIST})\\}\\}$`);
const ELSE_TAG = new RegExp(`^\\{\\{else(?:[ \\t]+(${NAME_LIST}))?\\}\\}$`);
const CLOSE_TAG = new RegExp(`^\\{\\{/(${NAME_LIST})?\\}\\}$`);
// The payload is required and may not span lines: an unterminated tag must not
// swallow the rest of the document.
const INLINE_TAG = new RegExp(
  `\\{\\{(\\^?)(${NAME_LIST})[ \\t]+([^{}\\n]+?)\\}\\}`,
  "g",
);

const ESCAPE_PLACEHOLDER = "\x00ESCAPED_VAR\x00";

/**
 * One source line, carrying its own terminator.
 *
 * `literal` marks the reconstructed tags of an unclosed section, which are not
 * eligible for tag recognition — that is what stops the inline pass from
 * half-consuming a section the block pass already gave up on.
 */
type Line = {
  text: string;
  literal: boolean;
};

/** A single conditional branch. `names` is null for an `{{else}}` branch. */
type Branch<T> = {
  names: ReadonlyArray<string> | null;
  negated: boolean;
  body: T;
};

/**
 * Split content into lines, each carrying its own terminator.
 *
 * @param args - Arguments object
 * @param args.content - The content to split
 *
 * @returns The lines
 */
const toLines = (args: { content: string }): Array<Line> => {
  const { content } = args;
  if (content.length === 0) {
    return [];
  }

  return content.split(/(?<=\n)/).map((text) => ({ text, literal: false }));
};

/**
 * Parse a comma-separated name list, rejecting anything that is not entirely
 * made of registered agent names.
 *
 * @param args - Arguments object
 * @param args.token - The raw name list from a tag
 *
 * @returns The names, or null when the token does not name agents
 */
const parseNameList = (args: {
  token: string;
}): ReadonlyArray<string> | null => {
  const { token } = args;
  const names = token.split(",");
  return names.every((name) => AGENT_NAME_SET.has(name)) ? names : null;
};

/**
 * Warn when a token is not an agent name but differs from one only by
 * separator or case, which is the common authoring typo.
 *
 * @param args - Arguments object
 * @param args.token - The name token found in the tag
 * @param args.warn - Warning sink
 */
const warnIfNearMiss = (args: { token: string; warn: TemplateWarning }) => {
  const { token, warn } = args;
  const normalized = token.toLowerCase().replace(/[_.]/g, "-");
  if (AGENT_NAME_SET.has(normalized)) {
    warn({
      message: `Unknown agent name "${token}" in a template tag. Did you mean "${normalized}"?`,
    });
  }
};

/**
 * Pick the first branch that applies to the agent.
 *
 * @param args - Arguments object
 * @param args.agentName - Agent being installed for
 * @param args.branches - Branches in source order
 * @param args.warn - Warning sink
 *
 * @returns The winning branch body, or null when nothing matched
 */
const resolveBranches = <T>(args: {
  agentName: AgentName;
  branches: Array<Branch<T>>;
  warn: TemplateWarning;
}): T | null => {
  const { agentName, branches, warn } = args;

  for (const branch of branches) {
    if (branch.names == null) {
      return branch.body;
    }
    const listed = branch.names.includes(agentName);
    if (branch.negated ? !listed : listed) {
      return branch.body;
    }
  }

  if (branches.length > 1) {
    warn({
      message: `No branch matched agent "${agentName}" and no {{else}} fallback was provided.`,
    });
  }
  return null;
};

type BlockFrame = {
  branches: Array<Branch<Array<Line>>>;
  raw: Array<Line>;
};

/**
 * Resolve standalone-line block sections. Tag lines are removed entirely so no
 * blank line is left behind.
 *
 * @param args - Arguments object
 * @param args.agentName - Agent being installed for
 * @param args.lines - The lines to resolve
 * @param args.warn - Warning sink
 *
 * @returns Lines with non-matching sections removed
 */
const expandBlocks = (args: {
  agentName: AgentName;
  lines: Array<Line>;
  warn: TemplateWarning;
}): Array<Line> => {
  const { agentName, lines, warn } = args;

  const root: Array<Line> = [];
  const stack: Array<BlockFrame> = [];

  const sink = () => {
    const frame = stack[stack.length - 1];
    return frame == null
      ? root
      : frame.branches[frame.branches.length - 1].body;
  };
  const recordRaw = (line: Line) => {
    const frame = stack[stack.length - 1];
    if (frame != null) {
      frame.raw.push(line);
    }
  };

  for (const line of lines) {
    const trimmed = line.text.trim();
    const openMatch = OPEN_TAG.exec(trimmed);
    const elseMatch = ELSE_TAG.exec(trimmed);
    const closeMatch = CLOSE_TAG.exec(trimmed);
    const tagLine: Line = { ...line, literal: true };

    if (openMatch != null) {
      const names = parseNameList({ token: openMatch[2] });
      if (names != null) {
        stack.push({
          branches: [{ names, negated: openMatch[1] === "^", body: [] }],
          raw: [tagLine],
        });
        continue;
      }
      warnIfNearMiss({ token: openMatch[2], warn });
    } else if (elseMatch != null && stack.length > 0) {
      const token = elseMatch[1];
      const names = token == null ? null : parseNameList({ token });
      if (token == null || names != null) {
        const frame = stack[stack.length - 1];
        frame.raw.push(tagLine);
        frame.branches.push({ names, negated: false, body: [] });
        continue;
      }
      warnIfNearMiss({ token, warn });
    } else if (closeMatch != null && stack.length > 0) {
      const token = closeMatch[1];
      if (token == null || parseNameList({ token }) != null) {
        const frame = stack.pop();
        if (frame == null) {
          continue;
        }
        const openerNames = frame.branches[0].names;
        const openerLabel = openerNames == null ? "" : openerNames.join(",");
        if (token != null && token !== openerLabel) {
          warn({
            message: `Closing tag {{/${token}}} does not match the {{#${openerLabel}}} it closes.`,
          });
        }
        frame.raw.push(tagLine);
        sink().push(
          ...(resolveBranches({ agentName, branches: frame.branches, warn }) ??
            []),
        );
        if (stack.length > 0) {
          stack[stack.length - 1].raw.push(...frame.raw);
        }
        continue;
      }
    }

    sink().push(line);
    recordRaw(line);
  }

  // Unclosed sections are emitted verbatim. Their tag lines stay literal so the
  // inline pass cannot consume them.
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame == null) {
      break;
    }
    const openerNames = frame.branches[0].names;
    const label = `${frame.branches[0].negated ? "^" : "#"}${
      openerNames == null ? "" : openerNames.join(",")
    }`;
    warn({ message: `Unclosed {{${label}}} section left as literal text.` });

    const target = stack.length > 0 ? stack[stack.length - 1].raw : root;
    for (const raw of frame.raw) {
      target.push(raw);
    }
  }

  return root;
};

type InlineTag = {
  start: number;
  end: number;
  branch: Branch<string>;
  isElse: boolean;
};

/**
 * Find the inline conditional tags in a line.
 *
 * @param args - Arguments object
 * @param args.text - The line to scan
 * @param args.warn - Warning sink
 *
 * @returns Tags in source order
 */
const collectInlineTags = (args: {
  text: string;
  warn: TemplateWarning;
}): Array<InlineTag> => {
  const { text, warn } = args;
  const tags: Array<InlineTag> = [];
  const scanner = new RegExp(INLINE_TAG.source, "g");

  let match = scanner.exec(text);
  while (match != null) {
    const [full, negation, token, payload] = match;
    const isElse = token === "else" && negation === "";
    const names = isElse ? null : parseNameList({ token });

    if (isElse || names != null) {
      tags.push({
        start: match.index,
        end: match.index + full.length,
        branch: { names, negated: negation === "^", body: payload },
        isElse,
      });
    } else {
      warnIfNearMiss({ token, warn });
    }

    match = scanner.exec(text);
  }

  return tags;
};

/**
 * Resolve inline conditionals within a single line. Adjacent tags separated
 * only by horizontal whitespace form one choice, so a trailing `{{else ...}}`
 * binds to the tags immediately before it.
 *
 * @param args - Arguments object
 * @param args.agentName - Agent being installed for
 * @param args.text - The line to resolve
 * @param args.warn - Warning sink
 *
 * @returns The line with non-matching inline variants removed
 */
const expandInline = (args: {
  agentName: AgentName;
  text: string;
  warn: TemplateWarning;
}): string => {
  const { agentName, text, warn } = args;
  const tags = collectInlineTags({ text, warn });
  if (tags.length === 0) {
    return text;
  }

  const runs: Array<Array<InlineTag>> = [];
  for (const tag of tags) {
    const current = runs[runs.length - 1];
    const previous = current?.[current.length - 1];
    if (
      previous != null &&
      /^[ \t]*$/.test(text.slice(previous.end, tag.start))
    ) {
      current.push(tag);
    } else {
      runs.push([tag]);
    }
  }

  let result = "";
  let cursor = 0;

  for (const run of runs) {
    const start = run[0].start;
    const end = run[run.length - 1].end;

    if (run.every((tag) => tag.isElse)) {
      warn({
        message:
          "An {{else ...}} tag is not attached to a preceding agent tag; left as literal text.",
      });
      continue;
    }

    const replacement =
      resolveBranches({
        agentName,
        branches: run.map((tag) => tag.branch),
        warn,
      }) ?? "";

    // Dropping a run would otherwise leave a doubled space behind.
    const consumeSpace =
      replacement.length === 0 && /[ \t]/.test(text[start - 1] ?? "");

    result += text.slice(cursor, consumeSpace ? start - 1 : start);
    result += replacement;
    cursor = end;
  }

  return result + text.slice(cursor);
};

/**
 * Lift backtick-wrapped tags out of the content so they survive as literal
 * text, run `transform`, then put them back.
 *
 * @param args - Arguments object
 * @param args.content - The content to process
 * @param args.transform - Applied to the content with tags lifted out
 *
 * @returns The transformed content with escaped tags restored
 */
const withEscapedTagsPreserved = (args: {
  content: string;
  transform: (args: { content: string }) => string;
}): string => {
  const { content, transform } = args;

  const escaped: Array<string> = [];
  const lifted = content.replace(/`(\{\{[^}]+\}\})`/g, (_, variable) => {
    escaped.push(variable);
    return `${ESCAPE_PLACEHOLDER}${escaped.length - 1}${ESCAPE_PLACEHOLDER}`;
  });

  return transform({ content: lifted }).replace(
    new RegExp(`${ESCAPE_PLACEHOLDER}(\\d+)${ESCAPE_PLACEHOLDER}`, "g"),
    (_, index) => `\`${escaped[parseInt(index)]}\``,
  );
};

/**
 * Keep only the content that applies to the target agent.
 *
 * Inline form:  `use the {{claude-code TaskCreate}}{{codex update_plan}}{{else your plan tool}} now`
 * Block form:   `{{#claude-code}} ... {{else codex}} ... {{else}} ... {{/}}`
 *
 * Tags naming anything other than a registered agent are left untouched. Tags
 * inside fenced code blocks are expanded like any other: both passes treat the
 * document uniformly, so wrap a tag in backticks to keep it literal.
 *
 * @param args - Arguments object
 * @param args.agentName - Agent being installed for; null leaves content as-is
 * @param args.content - The content to expand
 * @param args.onWarning - Called for authoring mistakes worth surfacing
 *
 * @returns Content with non-matching variants removed
 */
export const expandAgentConditionals = (args: {
  agentName?: AgentName | null;
  content: string;
  onWarning?: TemplateWarning | null;
}): string => {
  const { agentName, content, onWarning } = args;

  if (agentName == null) {
    return content;
  }

  const warn: TemplateWarning = onWarning ?? (() => undefined);

  return withEscapedTagsPreserved({
    content,
    transform: ({ content: lifted }) =>
      expandBlocks({ agentName, lines: toLines({ content: lifted }), warn })
        .map((line) =>
          line.literal
            ? line.text
            : expandInline({ agentName, text: line.text, warn }),
        )
        .join(""),
  });
};

/**
 * Substitute template placeholders in content with actual paths, and resolve
 * any agent conditionals for the target agent.
 *
 * Supported placeholders:
 * - {{skills_dir}} - Path to the installed skills directory
 * - {{profiles_dir}} - Path to profiles directory (~/.nori/profiles)
 * - {{commands_dir}} - Path to the installed commands directory
 * - {{install_dir}} - Path to install root (parent of agent config dir)
 *
 * Placeholders are substituted everywhere, including inside fenced code
 * blocks, because published skillsets put runnable commands in fences. Wrap a
 * placeholder in backticks to keep it literal. Agent conditionals follow the
 * same rule, so the two passes never disagree about what a fence means.
 *
 * @param args - Arguments object
 * @param args.agentName - Agent being installed for; enables conditionals
 * @param args.content - The content with placeholders
 * @param args.installDir - The agent config directory path (e.g. .claude dir)
 * @param args.commandsDir - Optional installed commands directory override
 * @param args.onWarning - Called for conditional authoring mistakes
 * @param args.skillsDir - Optional installed skills directory override
 *
 * @returns Content with placeholders replaced
 */
export const substituteTemplatePaths = (args: {
  agentName?: AgentName | null;
  commandsDir?: string | null;
  content: string;
  installDir: string;
  onWarning?: TemplateWarning | null;
  skillsDir?: string | null;
}): string => {
  const { agentName, content, installDir, skillsDir, commandsDir, onWarning } =
    args;

  // The installDir is the agent config directory, but profiles are in .nori/profiles
  // We need to get the parent directory to compute the nori profiles path
  const parentDir = path.dirname(installDir);
  const values: Record<(typeof TEMPLATE_PLACEHOLDER_NAMES)[number], string> = {
    skills_dir: skillsDir ?? path.join(installDir, "skills"),
    profiles_dir: getNoriSkillsetsDir(),
    commands_dir: commandsDir ?? path.join(installDir, "commands"),
    install_dir: parentDir,
  };

  const expanded = expandAgentConditionals({ agentName, content, onWarning });

  return withEscapedTagsPreserved({
    content: expanded,
    transform: ({ content: lifted }) =>
      TEMPLATE_PLACEHOLDER_NAMES.reduce(
        (text, name) => text.replaceAll(`{{${name}}}`, values[name]),
        lifted,
      ),
  });
};
