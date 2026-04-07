---
name: conventional-commits
description: Conventional Commits + ブランチ命名規則による一貫した Git ワークフロー
---

# Conventional Commits とブランチルール

## コミットフォーマット

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### タイプ

| タイプ | 使用場面 |
|--------|----------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみ |
| `style` | フォーマット変更、ロジック変更なし |
| `refactor` | 修正でも追加でもないコード変更 |
| `test` | テストの追加・修正 |
| `chore` | ビルド、ツール、依存関係 |
| `perf` | パフォーマンス改善 |
| `ci` | CI 設定 |

### スコープ

パッケージ名またはモジュール名を使用。利用可能なスコープは `.project-config.yml` を参照。

### 破壊的変更

タイプ/スコープの後に `!` を付ける: `feat(core)!: change Memory interface`
またはフッターに `BREAKING CHANGE:` を記述。

### 例

```
feat(core): add SearchMemoryUseCase
fix(storage-postgres): handle connection timeout
docs(adr): add ADR-001 for embedding model selection
chore(hooks): update dependencies
feat(core)!: change Memory interface
```

## ブランチ命名

```
[prefix]/#[issue-number]-[short-description]
```

### プレフィックス

| プレフィックス | 使用場面 |
|---------------|----------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `chore` | メンテナンス、ツール |
| `docs` | ドキュメント |
| `refactor` | リファクタリング |

### 例

```
feat/#12-add-memory-search
fix/#15-vector-index-error
chore/#20-update-deps
```

## ツール

- **commitlint** と `@commitlint/config-conventional` — コミットメッセージを検証
- **lefthook** — `commit-msg` フックで commitlint を実行

## チェックリスト

コミット前の確認:
- [ ] メッセージが `type(scope): description` フォーマットに従っている
- [ ] スコープが有効なパッケージ/モジュールに一致している
- [ ] 説明は命令形、小文字、ピリオドなし
- [ ] 破壊的変更は `!` または `BREAKING CHANGE:` フッターで明示されている
- [ ] ブランチ名が `[prefix]/#[issue]-[description]` フォーマットに従っている
