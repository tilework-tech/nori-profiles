---
name: Writing-Plans
description: Use when design is complete and you need detailed implementation tasks for engineers with zero codebase context - creates comprehensive implementation plans with exact file paths, complete code examples, and verification steps assuming engineer has minimal domain knowledge
---

<required>
*CRITICAL* Add the following steps to your Todo list using TodoWrite:

- Read the 'Guidelines'.
- Create a comprehensive plan that a senior engineer can follow.
<system-reminder>Any absolute paths in your plan MUST take into account any worktrees that may have been created</system-reminder>
- Think about edge cases. Add them to the plan.
- Think about questions or areas that require clarity. Add them to the plan.
- Emphasize how you will test your plan.
- Present plan to user.
  </required>

# Guidelines

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a talented developer. However, assume that they know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

Do not add code, but include enough detail that the necessary code is obvious.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**

- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure (Example)

````markdown
### Task N: [Component Name]

**Files:**

- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

Create a test, 'test_specific_behavior', that will test 'behavior' by ensuring
running function foo with input bar, and asserting that the result is baz.

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

`Implement minimal behavior by adding foo to bar and baz to qux.`

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```

````

## Plan Document Header

**Every plan MUST end with this footer:**

```markdown
**Testing Details** [Brief description of what tests are being added and how they specifically test BEHAVIOR and NOT just implementation]

**Implementation Details** [maximum 10 bullets about key details]

**Question** [any questions or concerns that may be relevant that need answers]

---
```

## Remember
- Exact file paths always, taking into account worktrees
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits
