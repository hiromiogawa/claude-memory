---
name: rule-measure
description: エージェントのルール効果を定量計測し、改善サイクルの基盤データを提供する
---

# ルール計測

エージェントのルール（スキル、CLAUDE.md、エージェント定義）の効果を定量的に集計する。

## いつ使うか

- failure-record スキルで FAIL エントリが 3 件蓄積したとき（rule-explore → rule-improve → rule-audit と連鎖する）
- 手動で「ルールの効果を確認したい」とき

## 計測手順

### 1. 前回のジャーナルを読む

```
memory_search query="rule-journal measure" tags=["rule-journal", "measure"] limit=3
```

前回の計測結果があれば、差分を意識して計測する。

### 2. 失敗履歴を集計

`docs/adr/0007-agent-failure-rules.md` を読み、以下を集計する:

- FAIL エントリの総数
- 前回計測以降の新規エントリ数
- 失敗の分類（ルール不足 / コンテキスト不足 / 判断ミス）ごとの件数
- 同種の失敗の再発有無（対策済みの失敗が再び発生していないか）

### 3. Git ログから傾向を収集

```
git log --oneline -20
```

以下を集計する:
- pre-commit hook の失敗回数（revert や fix コミットの頻度から推定）
- commitlint 失敗の有無

### 4. ルール総数を集計

```
# スキル数
ls .claude/skills/*/SKILL.md | wc -l

# エージェント定義数
ls .claude/agents/*.md | wc -l

# ADR-0007 の FAIL エントリ数
grep -c "^### FAIL-" docs/adr/0007-agent-failure-rules.md
```

前回計測からの増減を記録する。

### 5. 効果スコアを算出

各 FAIL エントリの「対策」について:
- **効果あり**: 対策後に同種の失敗が再発していない → スコア 1.0
- **効果不明**: まだ十分な期間が経過していない → スコア N/A
- **効果なし**: 対策後も同種の失敗が再発している → スコア 0.0

### 6. ジャーナルを保存

計測結果を memory_save で保存する:

```
memory_save content="[rule-measure journal YYYY-MM-DD]
- FAIL総数: N件（前回比 +M件）
- 新規FAIL: N件（分類: ルール不足 X件, コンテキスト不足 Y件, 判断ミス Z件）
- 再発: あり/なし（詳細: ...）
- スキル数: N（前回比 +M）
- エージェント定義数: N
- 効果スコア: FAIL-001=1.0, FAIL-002=1.0, FAIL-003=N/A
- hook失敗傾向: ..." tags=["rule-journal", "measure"] scope="project"
```

## 出力

このスキルの出力はジャーナル（memory）のみ。ファイル変更やIssue起票は行わない。
次のステップとして rule-explore を実行する。
