---
name: rule-audit
description: Use when rule-improve が起票したルール改善提案 Issue を検証し、承認するかクローズするか判断するとき
---

# ルール検証

rule-improve が起票した改善提案 Issue を精査し、妥当なものを承認、問題があるものをクローズする。

## いつ使うか

- rule-improve の直後（改善サイクルの最終ステップ）
- `rule-improvement` ラベルの未精査 Issue があるとき

## 検証手順

### 1. 未精査の Issue を取得

```
gh issue list --label "rule-improvement" --state open --json number,title,body
```

`approved` ラベルが付いていない Issue が検証対象。

### 2. 各 Issue を検証

Issue ごとに以下を確認する:

**整合性チェック**:
- 提案されたルールが既存ルールと矛盾していないか
- 既存スキルの内容を読んで確認する

**必要性チェック**:
- アーカイブ提案の場合: 直近の FAIL 履歴と照合し、本当に不要か確認
- 新規ルールの場合: 既に別のルールでカバーされていないか確認

**影響範囲チェック**:
- 1つのスキルの変更が他スキルに波及しないか
- エージェント定義の変更が依存方向ルールに影響しないか

**根拠チェック**:
- 計測データに裏付けがあるか（Measure のジャーナルと照合）
- 探索結果と整合しているか（Explore のジャーナルと照合）

### 3. 承認またはクローズ

**承認する場合**:
```
gh issue edit [NUMBER] --add-label "approved"
gh issue comment [NUMBER] --body "rule-audit: 検証OK。既存ルールとの矛盾なし、根拠十分。"
```

**クローズする場合**:
```
gh issue close [NUMBER] --comment "rule-audit: 却下。理由: [具体的な理由]"
```

却下理由の例:
- 既存ルール「X」と矛盾する
- 計測データの裏付けが不十分
- アーカイブ対象のルールが直近の失敗防止に寄与していた

### 4. サイクルメタ情報を更新

```
memory_save content="[rule-audit journal YYYY-MM-DD]
- 検証Issue数: N件
- 承認: #NNN, #NNN
- 却下: #NNN（理由: ...）
- サイクル完了時刻: YYYY-MM-DD HH:MM
- 次回閾値: 3（変更なし / 変更理由: ...）" tags=["rule-journal", "audit", "cycle-meta"] scope="project"
```

### 5. 古いジャーナルを整理

3世代（3回分のサイクル）より前のジャーナルを削除する:

```
memory_search query="rule-journal" tags=["rule-journal"] limit=50
# 3世代より前のジャーナルを特定して memory_delete
```

## 出力

Issue への承認（`approved` ラベル）またはクローズ（理由コメント付き）。
ジャーナルにサイクル完了を記録する。
