---
name: code-quality
description: コード品質ツールの設定と実行タイミングガイド
---

# コード品質ツール

## ツールスタック

| ツール | 用途 |
|--------|------|
| **Biome** | フォーマッター（Prettier の代替） |
| **OXLint** | リンター（全ルール有効ベース） |
| **knip** | 未使用コード・exports・依存の検出 |
| **dependency-cruiser** | 依存方向の強制 + 循環依存検出 |
| **Vitest** | テストフレームワーク |
| **lefthook** | Git hooks 管理 |
| **commitlint** | コミットメッセージ検証 |

## 実行タイミング

| ツール | pre-commit | pre-push | CI |
|--------|-----------|----------|-----|
| Biome (format) | o | | o |
| OXLint (lint) | o | | o |
| knip (変更分) | o | | |
| knip (全体) | | o | o |
| dependency-cruiser | o | | o (+ SVG) |
| TypeScript | | | o |
| commitlint | commit-msg | | |
| Vitest (unit) | | | o |
| Vitest (integration + E2E) | | | o |

## カバレッジ閾値

プロジェクト固有の値は `.project-config.yml` を参照。デフォルト:
- **最低:** 75%
- **目標:** 80%
- パッケージごとに計測（unit + integration）
- E2E はカバレッジ対象外

## dependency-cruiser ルール

以下を強制する:
1. **ドメイン層** はインフラ層・インターフェース層をインポートしてはならない
2. **インフラ層** はインターフェース層をインポートしてはならない
3. **循環依存の禁止**

CI で依存グラフの SVG を自動生成する。

## 設定ファイル

- `biome.json` — フォーマッター設定（リンターは無効、OXLint が担当）
- `.oxlintrc.json` — `"all": "warn"` ベース、必要に応じて個別ルールを無効化
- `knip.json` — ワークスペース対応、entry/project パターン
- `.dependency-cruiser.cjs` — 禁止依存ルール
- `lefthook.yml` — pre-commit, pre-push, commit-msg フック
- `commitlint.config.cjs` — Conventional Commits 設定（scope enum 付き）
