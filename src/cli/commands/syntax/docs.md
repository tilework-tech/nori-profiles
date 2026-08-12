# Noridoc: syntax

Path: @/src/cli/commands/syntax

### Overview

- Implements `nori-skillsets syntax`, the reference for the skillset template language: per-agent conditionals and install-time path placeholders
- Pure output command — no config reads, no filesystem writes, no network
- Exists so skillset authors (and the agents editing skillset files on their behalf) have one authoritative, always-current description of the syntax that the installer actually implements

### How it fits into the larger codebase

- Registered by `registerNoriSkillsetsSyntaxCommand` in @/src/cli/commands/noriSkillsetsCommands.ts and wired into the program in @/src/cli/nori-skillsets.ts, following the standard lazy-handler-import pattern
- Reads `AGENT_NAMES` from @/src/cli/features/agentNames.ts and `TEMPLATE_PLACEHOLDER_NAMES` from @/src/cli/features/template.ts, so the printed reference is derived from the same constants the expander uses rather than hand-maintained prose
- The behavior it documents lives entirely in @/src/cli/features/template.ts (`expandAgentConditionals`, `substituteTemplatePaths`); this folder never parses or transforms anything itself
- The top-level `--help` footer in @/src/cli/nori-skillsets.ts carries a compact version of the same syntax and points readers here

### Core Implementation

- `buildReference()` assembles the reference as an array of lines: inline form, block form, comma lists and negation, the agent name list, the placeholder list, and the backtick-escape note
- `syntaxMain()` takes no arguments and always writes plain text to stdout. The reference is a block of markdown meant to be read or piped, so there is no interactive framing to choose between; it returns the standard `CommandStatus` shape from @/src/cli/commands/commandStatus.ts
- Registration lives solely in `registerNoriSkillsetsSyntaxCommand` in @/src/cli/commands/noriSkillsetsCommands.ts, alongside every other nori-skillsets subcommand

### Things to Know

- **Every conditional example is inside a fenced code block, and that is load-bearing.** Conditional expansion skips fenced blocks (see @/src/cli/features/template.ts), so this reference is a fixed point of its own expansion for every agent — a property a unit test enforces. Moving an example out of a fence would cause the installer to consume it. Path placeholders are *not* fence-protected, so the placeholder list here would be rewritten if the reference were ever installed as a skill.
- The agent list and placeholder list are interpolated from constants, so adding an agent row or a new placeholder updates this output with no edit here. A test asserts every name in `AGENT_NAMES` appears in the command's output.
- Command exit status is always success; there is no failure path to handle.

Created and maintained by Nori.
