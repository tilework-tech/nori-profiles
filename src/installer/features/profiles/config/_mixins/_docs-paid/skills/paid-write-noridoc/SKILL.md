---
name: Write Noridoc
description: Write or update documentation in the server-side noridocs system.
---

# Write Noridoc

Writes documentation to the server-side noridocs system.

## When to Use

Use this when:

- Creating new server-side documentation
- Updating existing noridoc content
- Adding git repository links to docs

Use regular Write tool instead for:

- Local file modifications
- Files not managed by noridocs

## Usage

```bash
node ~/.claude/skills/write-noridoc/script.js --filePath="@/server/src/persistence" --content="# Documentation" [--gitRepoUrl="https://github.com/..."]
```

## Parameters

- `--filePath` (required): Path where doc would normally live (e.g., "@/server/src/persistence")
- `--content` (required): Markdown content
- `--gitRepoUrl` (optional): Link to git repository

## Example

```bash
node ~/.claude/skills/write-noridoc/script.js \
  --filePath="@/plugin/src/api" \
  --content="# API Client

Provides access to Nori backend." \
  --gitRepoUrl="https://github.com/theahura/nori-agent-brain"
```

## Output

Returns confirmation with version number (creates new version automatically).

## Requirements

- Paid Nori subscription
- Configured credentials in `~/nori-config.json`
