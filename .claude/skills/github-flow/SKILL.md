---
name: github-flow
description: Use when Issue を作成・階層付けするとき、PR を立てるとき、または GitHub Projects のステータスを更新するとき
---

# GitHub Flow

Issue を Epic / Task / Story / Bug の階層で管理し、PR と Issue を 1:1 で結ぶことで進捗とレビューを GitHub Projects で可視化する。

## Issue 階層

```
Epic (大きな機能単位)
  ├── Task (技術的な実装作業)      ← 基本1PR
  ├── Story (ユーザー視点の機能)    ← 基本1PR
  ├── Bug (不具合)                ← 基本1PR
  └── Task (大きい場合)
       ├── Subtask               ← 1PR
       └── Subtask               ← 1PR
```

### ルール

- Epic → Task/Story/Bug は **sub-issue** で表現
- Task等が2PR以上になりそうな場合 **Subtask** を作成
- **PR と Issue は 1:1** — 1つのPRは1つのIssueに紐付く
- PR に `Closes #XX` を含めて Issue を自動close

### Issue テンプレート

Issue テンプレートは `.github/ISSUE_TEMPLATE/` に配置:
- `epic.yml` — ゴール、完了条件、子Issue一覧
- `task.yml` — やること、受け入れ条件、技術メモ
- `bug.yml` — 何が起きたか、期待動作、再現手順、環境
- `story.yml` — ユーザーストーリー、受け入れ条件
- `subtask.yml` — 親Task、やること、完了条件

## GitHub Projects

| カラム | 説明 |
|--------|------|
| Backlog | 未着手 |
| Ready | 着手可能（依存解決済み） |
| In Progress | AI または人間が作業中 |
| Review | PR レビュー待ち |
| QA | 人間による動作確認 |
| Done | 完了 |

### 自動化

- PR 作成 → Issue が「In Progress」に移動
- PR マージ → Issue が「Done」に移動
- ラベル: `epic`, `task`, `story`, `bug`, `subtask`

## PR ルール

- タイトル: `type(scope): description`（Conventional Commits フォーマット）
- 本文: `Closes #XX` で Issue 紐付け
- 1 PR = 1 Issue
- レビュー + QA 承認後にマージ

## よくある間違い

| 間違い | 正しい対応 |
|--------|-----------|
| 1 PR に複数 Issue を混ぜる | PR と Issue は 1:1。Subtask に分割 |
| PR 本文に `Closes #XX` 無し | 必須。自動 close が効かず Done に遷移しない |
| Epic に直接 PR を紐付ける | Epic は Task/Story/Bug 経由で進捗させる |
| タイプラベル付け忘れ | `task`/`bug`/`story` 等のラベルを必ず付与 |

## ワークフロー

1. Issue を作成（テンプレート使用）
2. ブランチを切る（`feat/#12-description`）
3. 実装 + テスト
4. PR 作成（`Closes #12`）
5. Review → QA → Merge
6. Issue 自動close
