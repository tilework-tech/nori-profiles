# Noridoc: subagents

Path: @/plugin/src/installer/features/subagents

### Overview

Feature loader for installing profile-specific subagent configurations into Claude Code's ~/.claude/agents/ directory. Subagents are specialized agents with constrained tool sets and focused instructions, invoked by the main agent via the Task tool to delegate specific workflows like code analysis, documentation generation, and knowledge research.

### How it fits into the larger codebase

This loader is registered with @/plugin/src/installer/features/loaderRegistry.ts and executes during installation after the profiles loader has populated ~/.claude/profiles/. The loader reads the active profile from Config.profile.baseProfile (defaults to 'senior-swe') and copies all .md files (except docs.md) from @/plugin/src/installer/features/profiles/config/{profileName}/subagents/ to ~/.claude/agents/ (CLAUDE_AGENTS_DIR from @/plugin/src/installer/env.ts). The main agent invokes subagents using the Task tool with a subagent_type parameter matching the .md filename. Profile CLAUDE.md files (like @/plugin/src/installer/features/profiles/config/amol/CLAUDE.md) explicitly reference subagents in their workflow, particularly nori-knowledge-researcher during the research phase.

### Core Implementation

The getConfigDir() function constructs the profile-specific subagents path at profiles/config/{profileName}/subagents/. The registerSubagents() function creates ~/.claude/agents/ via fs.mkdir with recursive:true, reads all .md files from the profile's subagents directory (filtering out docs.md), and copies each to ~/.claude/agents/ using fs.copyFile. Each subagent .md file contains YAML frontmatter with name, description, tools (comma-separated list), and model (inherit). Subagents define specialized workflows with strict constraints - documentation subagents (nori-change-documenter, nori-initial-documenter, nori-codebase-analyzer, nori-codebase-locator, nori-codebase-pattern-finder) must ONLY document code without suggesting improvements, while nori-knowledge-researcher has a 15 tool call budget and explicit stop criteria. The unregisterSubagents() function removes all installed subagent files by reading the profile's subagent list and unlinking matching files from ~/.claude/agents/. The validate() function checks that ~/.claude/agents/ exists and all expected subagent files from the profile are present.

### Things to Know

All three built-in profiles (senior-swe, amol, product-manager) currently ship with the same 7 subagents: nori-change-documenter, nori-codebase-analyzer, nori-codebase-locator, nori-codebase-pattern-finder, nori-initial-documenter, nori-knowledge-researcher, nori-web-search-researcher. Each subagent has a constrained toolset - documentation subagents use Read/Grep/Glob/LS/Write/Edit, nori-knowledge-researcher adds Bash/WebFetch/WebSearch, and nori-web-search-researcher focuses on WebSearch/WebFetch. The critical architectural pattern is that documentation subagents are "documentarians not critics" - their instructions explicitly prohibit suggesting improvements, performing root cause analysis, or critiquing implementation. The nori-initial-documenter uses a mandatory **two-pass documentation approach**: a top-down pass (Step 3) creates initial docs.md files based on architectural understanding, then a bottom-up pass (Step 3.5) verifies accuracy by starting from leaf directories and working upward to ensure comprehensive coverage and correct any inaccuracies from the top-down pass. The nori-knowledge-researcher uses paid skills (Recall/Memorize) executed via Bash tool and has strict budget/stopping criteria to prevent over-researching. Subagent definitions use YAML frontmatter with tools as comma-separated strings and model:inherit to use the main agent's model. Profile switching via /switch-nori-profile triggers reinstallation which replaces all subagents with those from the new profile. Changes require Claude Code restart to take effect since subagents are loaded at startup.

Created and maintained by Nori.
