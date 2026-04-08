---
name: rule-improve
description: 計測・探索結果をもとにルール改善提案を GitHub Issue として起票する
---

# ルール改善提案

Measure と Explore の結果をもとに、ルールの改善提案を GitHub Issue として起票する。

**重要: このスキルはファイルを一切変更しない。** 改善は Issue 化し、通常の開発フロー（Issue → ブランチ → PR）で実施する。

## いつ使うか

- rule-explore の直後（改善サイクルの3番目のステップ）
- 手動で「改善提案を出したい」とき

## 改善提案手順

### 1. Measure + Explore のジャーナルを読む

```
memory_search query="rule-journal measure" tags=["rule-journal", "measure"] limit=1
memory_search query="rule-journal explore" tags=["rule-journal", "explore"] limit=1
```

### 2. 改善アクションを決定

ジャーナルの内容から、以下の改善アクションを検討する:

**新規ルール追加**: 未ルール化パターンが見つかった場合
- 失敗パターンから具体的なルール文言を起案
- どのスキル/CLAUDE.md/エージェント定義に追加するか特定

**ルール修正**: 既存ルールの改善が必要な場合
- 曖昧な表現を具体化
- 効果が薄いルールを強化

**ルールアーカイブ**: 効果スコアが低いルールがある場合
- 発火するが効果がない（同種の失敗が防げていない）ルールの削除を提案
- ADR-0007 から該当エントリにアーカイブ済みマークを付ける提案

### 3. Issue を起票

改善アクションごとに GitHub Issue を起票する:

```
gh issue create \
  --title "rule-improvement: [提案タイトル]" \
  --label "rule-improvement" \
  --body "## 提案種別
[新規ルール追加 / ルール修正 / ルールアーカイブ]

## 根拠
- Measure: [どの計測結果に基づくか]
- Explore: [どの探索結果に基づくか]

## 対象ファイル
- [変更するスキル/CLAUDE.md/エージェント定義のパス]

## 変更内容
[追加・修正するルールの具体的な文言案]

## 期待効果
[この改善で何が防げるようになるか]

---
*This issue was created by rule-improve skill.*"
```

### 4. 提案が不要な場合

Measure と Explore の結果から改善提案が見つからない場合は、Issue を起票せず、その旨をジャーナルに記録する。

### 5. ジャーナルを保存

```
memory_save content="[rule-improve journal YYYY-MM-DD]
- 起票Issue: #NNN [タイトル], #NNN [タイトル]
- 提案種別内訳: 新規N件, 修正N件, アーカイブN件
- 提案なし理由: （該当する場合）" tags=["rule-journal", "improve"] scope="project"
```

## 出力

GitHub Issues（ラベル: `rule-improvement`）。ファイル変更は行わない。
次のステップとして rule-audit を実行する。
