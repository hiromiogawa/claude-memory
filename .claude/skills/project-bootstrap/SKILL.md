---
name: project-bootstrap
description: Use when 新しいリポジトリを作成しこのプロジェクトの dev-skills 標準で初期化するとき
---

# プロジェクトブートストラップ

新プロジェクト開始時に以下のスキルを順序付きで実行する統括スキル。

## 前提条件

- `.project-config.yml` がプロジェクトルートに存在すること
- git が初期化されていること

## 実行順序

### フェーズ 1: コード品質セットアップ
**REQUIRED SUB-SKILL:** code-quality:
1. Biome 設定ファイル生成
2. OXLint 設定ファイル生成
3. knip 設定ファイル生成
4. dependency-cruiser 設定ファイル生成
5. Vitest 設定

### フェーズ 2: Git ワークフローセットアップ
**REQUIRED SUB-SKILL:** conventional-commits:
1. lefthook 設定
2. commitlint 設定
3. Git hooks インストール

### フェーズ 3: GitHub セットアップ
**REQUIRED SUB-SKILL:** github-flow:
1. Issue テンプレート作成 (`.github/ISSUE_TEMPLATE/`)
2. GitHub Projects 設定（手動 or gh CLI）
3. ラベル作成

### フェーズ 4: ドキュメントセットアップ
**REQUIRED SUB-SKILL:** sdd:
1. `docs/specs/` ディレクトリ作成
2. typedoc 設定

**REQUIRED SUB-SKILL:** adr:
1. `docs/adr/root/` ディレクトリ作成
2. `docs/adr/packages/` ディレクトリ作成

### フェーズ 5: CLAUDE.md
1. CLAUDE.md を生成（プロジェクト設定 + スキルへのポインタ + ドキュメント一覧）

## `.project-config.yml` テンプレート

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

## 確認事項

ブートストラップ後に確認:
- [ ] `pnpm lint` が通ること
- [ ] `pnpm test` が通ること（テストがまだない場合はOK）
- [ ] `pnpm knip` が通ること
- [ ] `pnpm dep-check` が通ること
- [ ] lefthook フックがインストールされていること
- [ ] Issue テンプレートが `.github/ISSUE_TEMPLATE/` に存在すること
- [ ] `docs/` の構造が作成されていること
- [ ] CLAUDE.md が正しいポインタで存在すること
