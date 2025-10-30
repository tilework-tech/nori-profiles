---
name: List Noridocs
description: List all server-side noridocs, optionally filtered by path prefix.
---

# List Noridocs

Lists all noridocs, optionally filtered by path prefix for tree navigation.

## When to Use

Use this when:

- Exploring available server-side documentation
- Finding docs in a specific directory/module
- Checking what documentation exists

## Usage

```bash
node ~/.claude/skills/list-noridocs/script.js [--pathPrefix="@/server"] [--limit=100]
```

## Parameters

- `--pathPrefix` (optional): Filter by prefix like "@/server"
- `--limit` (optional): Maximum results (default: 100)

## Examples

```bash
# List all noridocs
node ~/.claude/skills/list-noridocs/script.js

# List noridocs under server directory
node ~/.claude/skills/list-noridocs/script.js --pathPrefix="@/server"

# List with custom limit
node ~/.claude/skills/list-noridocs/script.js --pathPrefix="@/plugin" --limit=50
```

## Output

Returns list of noridoc paths with last updated timestamps.

## Requirements

- Paid Nori subscription
- Configured credentials in `~/nori-config.json`
