---
name: project-bootstrap
description: Orchestrator skill — initializes a new project with all dev-skills standards
---

# Project Bootstrap

新プロジェクト開始時に以下のスキルを順序付きで実行する統括スキル。

## Prerequisites

- `.project-config.yml` がプロジェクトルートに存在すること
- git が初期化されていること

## Execution Order

### Phase 1: Code Quality Setup
Invoke `code-quality` skill:
1. Biome 設定ファイル生成
2. OXLint 設定ファイル生成
3. knip 設定ファイル生成
4. dependency-cruiser 設定ファイル生成
5. Vitest 設定

### Phase 2: Git Workflow Setup
Invoke `conventional-commits` skill:
1. lefthook 設定
2. commitlint 設定
3. Git hooks インストール

### Phase 3: GitHub Setup
Invoke `github-flow` skill:
1. Issue テンプレート作成 (`.github/ISSUE_TEMPLATE/`)
2. GitHub Projects 設定（手動 or gh CLI）
3. ラベル作成

### Phase 4: Documentation Setup
Invoke `sdd` skill:
1. `docs/specs/` ディレクトリ作成
2. typedoc 設定

Invoke `adr` skill:
1. `docs/adr/root/` ディレクトリ作成
2. `docs/adr/packages/` ディレクトリ作成

Invoke `diagram-management` skill:
1. `docs/diagrams/` ディレクトリ作成
2. CI ワークフロー設定

### Phase 5: CLAUDE.md
1. CLAUDE.md を生成（プロジェクト設定 + スキルへのポインタ + ドキュメント一覧）

## .project-config.yml Template

```yaml
# Project-specific configuration values
# Referenced by skills for project-specific settings

project:
  name: my-project
  type: monorepo  # or single-package

coverage:
  minimum: 75
  target: 80

architecture:
  type: clean-architecture
  layers:
    domain: packages/core
    infrastructure:
      - packages/storage-postgres
    interface:
      - packages/mcp-server

scopes:
  - core
  - storage-postgres
  - mcp-server
```

## Verification

After bootstrap, verify:
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (or no tests yet)
- [ ] `pnpm knip` passes
- [ ] `pnpm dep-check` passes
- [ ] lefthook hooks are installed
- [ ] Issue templates exist in `.github/ISSUE_TEMPLATE/`
- [ ] `docs/` structure is created
- [ ] CLAUDE.md exists with correct pointers
