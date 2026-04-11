---
name: dev-start
description: Use when Issue に着手する直前、ブランチ作成や仕様確認などコンテキスト準備を始めるとき
---

# 開発開始

Issue に着手するとき、実装に入る前のコンテキスト準備を統括する。

## いつ使うか

- Issue に着手するとき（「#NNN をやろう」「次の Issue に取り掛かる」）
- superpowers:brainstorming の前に実行する

## 実行フロー

### Step 1: memory-usage（コンテキスト検索）

**REQUIRED SUB-SKILL:** memory-usage に従い、関連する記憶を検索する:

```
memory_search query="[Issue のキーワード]" limit=5
memory_search query="[対象パッケージ名]" tags=["design-decision"] limit=5
```

過去の設計判断、既知の制約、関連するバグ情報を把握する。

### Step 2: github-flow（Issue確認・ブランチ作成）

**REQUIRED SUB-SKILL:** github-flow に従い:

1. Issue の内容を確認（`gh issue view [NUMBER]`）
2. 関連 Issue があればリンクを確認
3. ブランチを作成（命名規則: `[prefix]/#[issue]-[description]`）

### Step 3: sdd（仕様確認）

**REQUIRED SUB-SKILL:** sdd に従い:

1. 仕様ドキュメントがあれば読む
2. なければ Issue の受け入れ条件を仕様として整理
3. JSDoc で定義すべきインターフェースを特定

### 完了条件

以下が揃った状態で brainstorming や実装に進む:

- [ ] 関連する記憶を検索済み
- [ ] Issue の内容と受け入れ条件を把握済み
- [ ] ブランチを作成済み
- [ ] 仕様（または Issue の受け入れ条件）を確認済み
