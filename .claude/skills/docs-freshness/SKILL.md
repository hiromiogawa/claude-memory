---
name: docs-freshness
description: Documentation freshness rules — classify docs as Why/What/How, auto-generate What, check diffs in CI
---

# Documentation Freshness

## Principle

Classify all documentation into three categories with different maintenance strategies.

| Category | Content | Maintenance |
|----------|---------|-------------|
| **Why** | Design decisions, tech selection rationale, rejected alternatives | ADR + long-term memory |
| **What** | API specs, DB schema, dependency graphs | Auto-generate from code |
| **How** | Setup instructions, CI config, operations | Manual update on change |

## What: Auto-Generation

- Run `pnpm docs:generate` to regenerate all What docs
- Output to `docs/generated/` — never edit by hand
- CI checks diff between generated output and committed files
- If CI fails: run `pnpm docs:generate` locally and commit

## Why: Design Records

- Any "A vs B" decision → create ADR in `docs/adr/`
- Save to long-term memory simultaneously
- Focus on rejected alternatives (not derivable from code)

## How: Manual Docs

- README, CONTRIBUTING, operations.md
- Update when the process changes
- PR template includes checklist to verify

## PR Checklist

Include in PR template:
- `pnpm docs:generate` run with no diff?
- ADR added for design decisions?
- How docs updated if process changed?

## Anti-Pattern

"This is obvious from the code" → Then don't document it. Let JSDoc + auto-generation handle it.
"This might rot" → Auto-generate it or don't write it.
