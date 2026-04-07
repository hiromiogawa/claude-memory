---
name: code-quality
description: Code quality tooling setup and execution timing guide
---

# Code Quality Tools

## Tool Stack

| Tool | Purpose |
|------|---------|
| **Biome** | Formatter (Prettier alternative) |
| **OXLint** | Linter (全ルール有効ベース) |
| **knip** | 未使用コード・exports・依存の検出 |
| **dependency-cruiser** | 依存方向の強制 + 循環依存検出 |
| **Vitest** | テストフレームワーク |
| **lefthook** | Git hooks 管理 |
| **commitlint** | コミットメッセージ検証 |

## Execution Timing

| Tool | pre-commit | pre-push | CI |
|------|-----------|----------|-----|
| Biome (format) | o | | o |
| OXLint (lint) | o | | o |
| knip (変更分) | o | | |
| knip (全体) | | o | o |
| dependency-cruiser | o | | o (+ SVG) |
| TypeScript | | | o |
| commitlint | commit-msg | | |
| Vitest (unit) | | | o |
| Vitest (integration + E2E) | | | o |

## Coverage Thresholds

Check `.project-config.yml` for project-specific values. Default:
- **Minimum:** 75%
- **Target:** 80%
- Measured per-package (unit + integration)
- E2E is excluded from coverage

## dependency-cruiser Rules

Must enforce:
1. **Domain layer** must not import infrastructure or interface layers
2. **Infrastructure layer** must not import interface layer
3. **No circular dependencies**

SVG dependency graph is auto-generated in CI.

## Configuration Files

- `biome.json` — formatter config (linter disabled, OXLint handles it)
- `.oxlintrc.json` — `"all": "warn"` base, disable specific rules as needed
- `knip.json` — workspace-aware, entry/project patterns
- `.dependency-cruiser.cjs` — forbidden dependency rules
- `lefthook.yml` — pre-commit, pre-push, commit-msg hooks
- `commitlint.config.cjs` — Conventional Commits config with scope enum
