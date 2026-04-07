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
