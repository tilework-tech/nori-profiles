---
description: Switch between Nori configuration skillsets (amol, senior-swe, product-manager, documenter, none)
---

Switch to a different Nori configuration skillset.

This command is intercepted by a hook and executed directly without LLM processing.

**Usage:** `/nori-switch-skillset <skillset-name>`

**Examples:**
- `/nori-switch-skillset senior-swe`
- `/nori-switch-skillset product-manager`
- `/nori-switch-skillset` (shows available skillsets)

After switching, restart Claude Code to apply the new skillset.
