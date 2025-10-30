---
name: Read Noridoc
description: Read documentation from the server-side noridocs system by file path.
---

# Read Noridoc

Reads documentation from the server-side noridocs system.

## When to Use

Use this when:

- Reading server-side documentation
- Checking documentation version history
- Viewing git repository links for docs

Use regular Read tool instead for:

- Local file contents
- Files not in noridocs system

## Usage

```bash
node ~/.claude/skills/read-noridoc/script.js --filePath="@/server/src/persistence"
```

## Parameters

- `--filePath` (required): Path like "@/server/src/persistence"

## Example

```bash
node ~/.claude/skills/read-noridoc/script.js --filePath="@/plugin/src/api"
```

## Output

Returns documentation content with version number, last updated timestamp, and git repository link (if available).

## Requirements

- Paid Nori subscription
- Configured credentials in `~/nori-config.json`
