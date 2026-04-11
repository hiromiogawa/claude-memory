---
name: rule-explore
description: Use when rule-measure の直後、計測数字に表れないボトルネックやスキル間の矛盾・未ルール化パターンを洗い出したいとき
---

# ルール探索

計測データだけでは見えないボトルネック、未知のパターン、ルール間の矛盾を探す。

## いつ使うか

- rule-measure の直後（改善サイクルの2番目のステップ）
- 手動で「ルールの問題点を洗い出したい」とき

## 探索手順

### 1. Measure のジャーナルを読む

```
memory_search query="rule-journal measure" tags=["rule-journal", "measure"] limit=1
```

最新の計測結果を把握してから探索を開始する。

### 2. 前回の Explore ジャーナルを読む

```
memory_search query="rule-journal explore" tags=["rule-journal", "explore"] limit=1
```

前回の探索で見つかった問題が解決されたか確認する。

### 3. スキル間の矛盾・重複を探す

全スキルファイルを読み、以下を確認する:

```
ls .claude/skills/*/SKILL.md
```

- 2つのスキルが同じことを違う言い方で指示していないか
- あるスキルの指示が別のスキルと矛盾していないか
- 1つのスキルに統合すべき重複がないか

### 4. エージェント定義のスコープ漏れを探す

```
ls .claude/agents/*.md
```

- 依存方向ルールが実際のコードの import と合っているか
- 新しく追加されたファイルやパッケージがスコープから漏れていないか

### 5. ルール化されていないパターンを探す

直近の PR レビューコメントやコミット履歴から、繰り返し指摘されるがルール化されていないパターンを探す:

```
# 直近のマージ済みPRを確認
gh pr list --state merged --limit 10

# 直近のコミットメッセージからfixパターンを確認
git log --oneline --grep="fix" -20
```

### 6. 効果スコアが低いルールを特定

Measure のジャーナルから効果スコアが 0.0 のルールを抽出し、アーカイブ候補として記録する。

### 7. ジャーナルを保存

```
memory_save content="[rule-explore journal YYYY-MM-DD]
- スキル矛盾: あり/なし（詳細: ...）
- スキル重複: あり/なし（詳細: ...）
- スコープ漏れ: あり/なし（詳細: ...）
- 未ルール化パターン: N件（詳細: ...）
- アーカイブ候補: FAIL-NNN（理由: ...）
- 前回指摘の解決状況: ..." tags=["rule-journal", "explore"] scope="project"
```

## 出力

このスキルの出力はジャーナル（memory）のみ。ファイル変更やIssue起票は行わない。
次のステップとして rule-improve を実行する。
