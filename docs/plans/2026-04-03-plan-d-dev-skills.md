# Plan D: Dev Skills Repository

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Create a reusable skill repository for standardized development workflows

**Architecture:** Collection of single-responsibility Claude Code skills with one orchestrator skill. Skills are markdown files loaded by Claude Code's Skill tool.

**Tech Stack:** Markdown, Claude Code Skills format

**Prerequisites:** None (independent repository)

**Blocks:** None (can be used by claude-memory once both are ready)

---

## File Structure

```
dev-skills/
├── skills/
│   ├── conventional-commits/
│   │   └── conventional-commits.md
│   ├── github-flow/
│   │   └── github-flow.md
│   ├── sdd/
│   │   └── sdd.md
│   ├── adr/
│   │   └── adr.md
│   ├── code-quality/
│   │   └── code-quality.md
│   ├── diagram-management/
│   │   └── diagram-management.md
│   └── project-bootstrap/
│       └── project-bootstrap.md
├── README.md
├── LICENSE
└── .gitignore
```

---

## Task 1: Repository Initialization

- [ ] **Step 1: Create repository**

```bash
mkdir -p /Users/ogawahiromi/work/develop/dev-skills
cd /Users/ogawahiromi/work/develop/dev-skills
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
.DS_Store
```

- [ ] **Step 3: Create LICENSE (MIT)**

```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Create README.md**

```markdown
# Dev Skills

Claude Code 用の再利用可能な開発ワークフロースキル集。

## スキル一覧

| スキル | 説明 |
|--------|------|
| conventional-commits | コミット・ブランチルール |
| github-flow | Issue階層・PR・Projects運用 |
| sdd | 仕様駆動開発フロー |
| adr | ADR作成・管理 |
| code-quality | OXLint/Biome/knip/dependency-cruiser |
| diagram-management | draw.io・依存グラフCI自動生成 |
| project-bootstrap | 統括スキル（新プロジェクト初期化） |

## 使い方

Claude Code の settings.json でスキルディレクトリを設定するか、各スキルを `/skill` コマンドで呼び出す。
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore LICENSE README.md
git commit -m "chore: initialize dev-skills repository"
```

---

## Task 2: conventional-commits Skill

- [ ] **Step 1: Create skill file**

```bash
mkdir -p skills/conventional-commits
```

Write `skills/conventional-commits/conventional-commits.md`:

````markdown
---
name: conventional-commits
description: Conventional Commits + branch naming rules for consistent git workflow
---

# Conventional Commits & Branch Rules

## Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes nor adds |
| `test` | Adding or correcting tests |
| `chore` | Build process, tooling, dependencies |
| `perf` | Performance improvement |
| `ci` | CI configuration |

### Scope

Use the package or module name. Check `.project-config.yml` for available scopes.

### Breaking Changes

Add `!` after type/scope: `feat(core)!: change Memory interface`
Or add `BREAKING CHANGE:` in the footer.

### Examples

```
feat(core): add SearchMemoryUseCase
fix(storage-postgres): handle connection timeout
docs(adr): add ADR-001 for embedding model selection
chore(hooks): update dependencies
feat(core)!: change Memory interface
```

## Branch Naming

```
[prefix]/#[issue-number]-[short-description]
```

### Prefixes

| Prefix | When to use |
|--------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, tooling |
| `docs` | Documentation |
| `refactor` | Code refactoring |

### Examples

```
feat/#12-add-memory-search
fix/#15-vector-index-error
chore/#20-update-deps
```

## Tooling

- **commitlint** with `@commitlint/config-conventional` — validates commit messages
- **lefthook** — runs commitlint on `commit-msg` hook

## Checklist

Before committing:
- [ ] Message follows `type(scope): description` format
- [ ] Scope matches a valid package/module
- [ ] Description is imperative mood, lowercase, no period
- [ ] Breaking changes are marked with `!` or `BREAKING CHANGE:` footer
- [ ] Branch name follows `[prefix]/#[issue]-[description]` format
````

- [ ] **Step 2: Commit**

```bash
git add skills/conventional-commits/
git commit -m "feat: add conventional-commits skill"
```

---

## Task 3: github-flow Skill

- [ ] **Step 1: Create skill file**

```bash
mkdir -p skills/github-flow
```

Write `skills/github-flow/github-flow.md`:

````markdown
---
name: github-flow
description: Issue hierarchy, PR management, and GitHub Projects workflow
---

# GitHub Flow

## Issue Hierarchy

```
Epic (大きな機能単位)
  ├── Task (技術的な実装作業)      ← 基本1PR
  ├── Story (ユーザー視点の機能)    ← 基本1PR
  ├── Bug (不具合)                ← 基本1PR
  └── Task (大きい場合)
       ├── Subtask               ← 1PR
       └── Subtask               ← 1PR
```

### Rules

- Epic → Task/Story/Bug は **sub-issue** で表現
- Task等が2PR以上になりそうな場合 **Subtask** を作成
- **PR と Issue は 1:1** — 1つのPRは1つのIssueに紐付く
- PR に `Closes #XX` を含めて Issue を自動close

### Issue Templates

Issue templates are in `.github/ISSUE_TEMPLATE/`:
- `epic.yml` — ゴール、完了条件、子Issue一覧
- `task.yml` — やること、受け入れ条件、技術メモ
- `bug.yml` — 何が起きたか、期待動作、再現手順、環境
- `story.yml` — ユーザーストーリー、受け入れ条件
- `subtask.yml` — 親Task、やること、完了条件

## GitHub Projects

| Column | Description |
|--------|-------------|
| Backlog | 未着手 |
| Ready | 着手可能（依存解決済み） |
| In Progress | AI または人間が作業中 |
| Review | PR レビュー待ち |
| QA | 人間による動作確認 |
| Done | 完了 |

### Automation

- PR created → Issue moves to "In Progress"
- PR merged → Issue moves to "Done"
- Labels: `epic`, `task`, `story`, `bug`, `subtask`

## PR Rules

- Title: `type(scope): description` (Conventional Commits format)
- Body: `Closes #XX` で Issue 紐付け
- 1 PR = 1 Issue
- レビュー + QA 承認後にマージ

## Workflow

1. Issue を作成（テンプレート使用）
2. ブランチを切る（`feat/#12-description`）
3. 実装 + テスト
4. PR 作成（`Closes #12`）
5. Review → QA → Merge
6. Issue 自動close
````

- [ ] **Step 2: Commit**

```bash
git add skills/github-flow/
git commit -m "feat: add github-flow skill"
```

---

## Task 4: sdd Skill

- [ ] **Step 1: Create skill file**

```bash
mkdir -p skills/sdd
```

Write `skills/sdd/sdd.md`:

````markdown
---
name: sdd
description: Spec-Driven Development flow — design with Markdown specs, implement with JSDoc as SSoT
---

# Spec-Driven Development (SDD)

## Principle

仕様は **Single Source of Truth (SSoT)** として機能する。

## Flow

### Phase 1: Design (Markdown)

1. `docs/specs/YYYY-MM-DD-<topic>-design.md` に仕様書を作成
2. 仕様書にはアーキテクチャ、エンティティ、インターフェース、データフローを含める
3. レビュー → 承認

### Phase 2: Implementation (JSDoc Migration)

1. 仕様書の型定義をコードに移行
2. **JSDoc** で仕様をコード内に記述（SSoTの移行）
3. 型 + JSDoc が仕様の正（SSoT）となる

### Phase 3: Maintenance

1. 以降の仕様変更は **JSDoc を直接更新**
2. Markdown 仕様書はアーカイブ（参照用に残す）
3. `typedoc` で API 仕様書を自動生成

## Documentation

```
docs/
  specs/         # Phase 1 の仕様書
  api/           # typedoc 自動生成出力
```

## typedoc

- CIで自動生成（PR時）
- GitHub Pages or `docs/api/` に出力
- JSDoc の `@remarks`, `@example`, `@see` を活用

## Checklist

- [ ] 仕様書は `docs/specs/` に保存
- [ ] 型定義には JSDoc を記述
- [ ] `@remarks` で制約条件を明記
- [ ] `@example` で使用例を記述
- [ ] typedoc でビルドが通ることを確認
````

- [ ] **Step 2: Commit**

```bash
git add skills/sdd/
git commit -m "feat: add sdd skill"
```

---

## Task 5: adr Skill

- [ ] **Step 1: Create skill file**

```bash
mkdir -p skills/adr
```

Write `skills/adr/adr.md`:

````markdown
---
name: adr
description: Architecture Decision Record creation and management
---

# ADR (Architecture Decision Records)

## When to Create

- 技術選定（ライブラリ、フレームワーク、DB等）
- アーキテクチャの重要な決定
- 代替案を検討した結果の判断
- 将来の自分やチームメンバーが「なぜこうなっているか」を知りたくなる決定

## File Organization

```
docs/adr/
  root/                    # プロジェクト全体の決定
    ADR-001-xxx.md
    ADR-002-xxx.md
  packages/                # パッケージ固有の決定
    core/
      ADR-001-xxx.md
    storage-postgres/
      ADR-001-xxx.md
```

## Template

```markdown
# ADR-XXX: タイトル

## ステータス
Proposed | Accepted | Deprecated | Superseded by ADR-YYY

## コンテキスト
なぜこの決定が必要だったか。背景と制約条件。

## 決定
何を選んだか。具体的に。

## 選択肢

| 選択肢 | メリット | デメリット |
|--------|---------|----------|
| A      |         |          |
| B      |         |          |
| C      |         |          |

## 結果
この決定による影響。何が変わるか。
```

## Naming

`ADR-XXX-short-description.md`
- XXX は連番（001, 002, ...）
- root と packages で独立した連番

## Rules

- ADR は **不変** — 変更する場合は新しい ADR で Supersede
- ステータスを更新して「Deprecated」or「Superseded by ADR-YYY」にする
- コミット: `docs(adr): add ADR-XXX for topic`
````

- [ ] **Step 2: Commit**

```bash
git add skills/adr/
git commit -m "feat: add adr skill"
```

---

## Task 6: code-quality Skill

- [ ] **Step 1: Create skill file**

```bash
mkdir -p skills/code-quality
```

Write `skills/code-quality/code-quality.md`:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add skills/code-quality/
git commit -m "feat: add code-quality skill"
```

---

## Task 7: diagram-management Skill

- [ ] **Step 1: Create skill file**

```bash
mkdir -p skills/diagram-management
```

Write `skills/diagram-management/diagram-management.md`:

````markdown
---
name: diagram-management
description: draw.io diagram conventions and CI auto-generation
---

# Diagram Management

## Diagram Types

| Type | Location | Purpose |
|------|----------|---------|
| Architecture | `docs/diagrams/architecture.drawio` | パッケージ構成・依存関係 |
| Data Flow | `docs/diagrams/data-flow.drawio` | 保存・検索・Hooksフロー |
| Harness | `docs/diagrams/harness.drawio` | ハーネスエンジニアリング構造 |
| Dependency Graph | `docs/diagrams/dependency-graph.svg` | dependency-cruiser 自動生成 |

## draw.io Conventions

- 1ファイルに複数ページ可（タブで切り替え）
- 色分け: Domain=青, Infrastructure=緑, Interface=赤, Interface型=黄, UseCase=紫
- 凡例を必ず含める

## When to Update

- パッケージの追加・削除
- 依存関係の変更
- データフローの変更
- アーキテクチャの重要な変更

**ルール: コードを変更したら図も更新する**

## CI Auto-Generation

### draw.io → PNG

```yaml
# .github/workflows/docs.yml
- uses: rlespinasse/drawio-export-action@v2
  with:
    path: docs/diagrams
    format: png
    output: docs/images
```

### dependency-cruiser → SVG

```yaml
- run: npx depcruise --output-type dot packages/ | dot -T svg > docs/diagrams/dependency-graph.svg
```

Both run on every PR and commit to `docs/images/` and `docs/diagrams/`.

## Viewing

- SVG: GitHub で直接プレビュー可能
- PNG: GitHub で直接プレビュー可能
- draw.io: app.diagrams.net or VS Code 拡張で編集
````

- [ ] **Step 2: Commit**

```bash
git add skills/diagram-management/
git commit -m "feat: add diagram-management skill"
```

---

## Task 8: project-bootstrap Skill (Orchestrator)

- [ ] **Step 1: Create skill file**

```bash
mkdir -p skills/project-bootstrap
```

Write `skills/project-bootstrap/project-bootstrap.md`:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add skills/project-bootstrap/
git commit -m "feat: add project-bootstrap orchestrator skill"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Verify all files exist**

```bash
find skills/ -name "*.md" | sort
```
Expected:
```
skills/adr/adr.md
skills/code-quality/code-quality.md
skills/conventional-commits/conventional-commits.md
skills/diagram-management/diagram-management.md
skills/github-flow/github-flow.md
skills/project-bootstrap/project-bootstrap.md
skills/sdd/sdd.md
```

- [ ] **Step 2: Push to GitHub**

```bash
gh repo create dev-skills --public --source=. --push
```
