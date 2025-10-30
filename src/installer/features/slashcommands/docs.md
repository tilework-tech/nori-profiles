# Noridoc: slashcommands

Path: @/plugin/src/installer/features/slashcommands

### Overview

Feature loader that installs profile-specific slash commands into Claude Code. Slash commands are user-invocable workflows defined as markdown files with YAML frontmatter, registered to ~/.claude/commands/ and accessible as /command-name in Claude Code conversations.

### How it fits into the larger codebase

This feature loader (loader.ts) is registered with @/plugin/src/installer/features/loaderRegistry.ts and executed during installation. It reads slash command definitions from profile directories at ~/.claude/profiles/{profileName}/slashcommands/ (populated by @/plugin/src/installer/features/profiles) and copies them to ~/.claude/commands/ (CLAUDE_COMMANDS_DIR from @/plugin/src/installer/env.ts). The loader determines which profile to use from Config.profile.baseProfile (defaults to 'senior-swe'), enabling profile-specific command sets. Each profile can define different slash commands tailored to its use case.

### Core Implementation

The registerSlashCommands() function (loader.ts:47-101) reads the profile name from config.profile.baseProfile, constructs the source path via getConfigDir() to ~/.claude/profiles/{profileName}/slashcommands/, creates ~/.claude/commands/ if needed, and copies all .md files (excluding docs.md) to the commands directory. Each slash command is a markdown file with YAML frontmatter containing 'description' (command summary) and optionally 'allowed-tools' (restricts which tools Claude can use). The unregisterSlashCommands() function (loader.ts:108-154) removes only the .md files that exist in the profile's slashcommands directory, leaving other user-created commands intact. The validate() function (loader.ts:163-233) verifies ~/.claude/commands/ exists and checks that all expected slash commands from the profile are present. Built-in commands include /initialize-noridocs (uses nori-initial-documenter subagent), /nori-info (displays feature documentation), /nori-debug (runs npx nori-ai check), /switch-nori-profile (switches active profile via npx nori-ai switch-profile), and /sync-noridocs (paid feature that bulk syncs all local docs.md files to server-side noridocs via the sync-noridocs skill).

### Things to Know

Slash commands are profile-specific, meaning different profiles can provide different command sets. Commands can also be tier-specific - the \_paid mixin at @/plugin/src/installer/features/profiles/config/\_mixins/\_paid/slashcommands/ contains slash commands only available to paid users (currently /sync-noridocs). The \_base mixin provides core commands available to all users (initialize-noridocs, nori-info, nori-debug, switch-nori-profile). The loader follows the profile-based architecture introduced in PR #197 - it reads from ~/.claude/profiles/ rather than from the package's bundled config directory, allowing users to customize slash commands by editing their profile directory. The YAML frontmatter's 'allowed-tools' field can restrict commands to specific tools (e.g., "Task(subagent_type:nori-initial-documenter)" for /initialize-noridocs) or tool patterns (e.g., "Bash(node ~/.claude/skills/sync-noridocs/script.js:\*)" for /sync-noridocs). Changes to slash command files in the profile directory require running 'nori-ai install' to copy updates to ~/.claude/commands/. The loader uses fs.copyFile which overwrites existing files, so reinstalling always updates commands to match the profile definition.
