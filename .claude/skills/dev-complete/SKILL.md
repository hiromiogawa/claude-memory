---
name: dev-complete
description: Use when 実装が一段落し、コミット・PR作成に向けて仕上げ作業を始めるとき
---

# 開発完了

実装が終わったとき、コミット・PR作成までの仕上げを統括する。

## いつ使うか

- 実装が一段落したとき（「実装できた」「テスト通った」）
- superpowers:verification-before-completion と併用する

## 実行フロー

### Step 1: self-review（検証サイクル）

**REQUIRED SUB-SKILL:** self-review に従い、全チェックをパスするまで修正する:

```
pnpm lint → pnpm test → pnpm dep-check → pnpm knip
```

全パスするまでコミットしない。

### Step 2: docs-freshness（ドキュメント確認）

**REQUIRED SUB-SKILL:** docs-freshness に従い:

1. 変更したコードに関連するドキュメントがあるか確認
2. 型定義を変更した場合は JSDoc も更新されているか確認
3. 自動生成ドキュメント（mcp-tools.md, dependency-graph.svg）の再生成が必要か確認

### Step 3: conventional-commits（コミット）

**REQUIRED SUB-SKILL:** conventional-commits に従い:

1. 変更をステージング
2. `type(scope): description` フォーマットでコミット
3. scope は対象パッケージ名（core, storage-postgres, embedding-onnx, mcp-server, hooks）

### Step 4: github-flow（PR作成）

**REQUIRED SUB-SKILL:** github-flow に従い:

1. ブランチをプッシュ
2. PR を作成（関連 Issue を Closes で紐付け）
3. レビューを依頼

### 完了条件

- [ ] self-review 全パス
- [ ] ドキュメント更新確認済み
- [ ] Conventional Commits でコミット済み
- [ ] PR 作成済み（Issue 紐付け済み）
