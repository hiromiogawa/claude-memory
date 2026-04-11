---
name: rule-cycle
description: Use when failure-record に FAIL エントリを追記した直後、またはユーザーから「ルールを改善して」と依頼されたとき
---

# ルール改善サイクル

rule-measure → rule-explore → rule-improve → rule-audit を順次実行するオーケストレーター。

## いつ使うか

- failure-record スキルで FAIL エントリを追記した後（閾値チェック付き）
- 手動で「ルールを改善して」「ルールの効果を確認して」と依頼されたとき

## 実行フロー

### 1. 閾値チェック（failure-record からの呼び出し時）

前回サイクル実行以降の新規 FAIL エントリ数を確認する:

```
# 前回サイクル実行時刻を取得
memory_search query="rule-journal cycle-meta" tags=["rule-journal", "cycle-meta"] limit=1
```

前回の cycle-meta ジャーナルに記録された FAIL 総数と、現在の FAIL 総数を比較する:

```
grep -c "^### FAIL-" docs/adr/0007-agent-failure-rules.md
```

**差分が 3 件未満**: サイクルを実行しない。「FAIL エントリが N 件蓄積。閾値 3 件まであと M 件。」と報告して終了。

**差分が 3 件以上**: サイクルを実行する。

**手動呼び出し時**: 閾値チェックをスキップし、即座にサイクルを実行する。

### 2. サイクル実行

以下を **この順番で** 実行する。各ステップの完了を確認してから次に進む。

#### Step 1: rule-measure（計測）

**REQUIRED SUB-SKILL:** rule-measure を実行する。ADR-0007 の失敗履歴、Git ログ、ルール総数を集計し、効果スコアを算出。結果は memory にジャーナル保存される。

#### Step 2: rule-explore（探索）

**REQUIRED SUB-SKILL:** rule-explore を実行する。Measure の結果を踏まえ、スキル間の矛盾・重複、未ルール化パターン、アーカイブ候補を探す。結果は memory にジャーナル保存される。

#### Step 3: rule-improve（改善提案）

**REQUIRED SUB-SKILL:** rule-improve を実行する。Measure + Explore の結果から改善提案を GitHub Issue として起票する。ファイルは変更しない。

#### Step 4: rule-audit（検証）

**REQUIRED SUB-SKILL:** rule-audit を実行する。Improve が起票した Issue を精査し、承認（`approved` ラベル）またはクローズする。サイクルメタ情報を memory に保存し、古いジャーナルを整理する。

### 3. 完了報告

サイクル完了後、以下を報告する:

- 計測結果のサマリ（FAIL 総数、新規件数、効果スコア）
- 探索で見つかった問題（矛盾、重複、未ルール化パターン）
- 起票された Issue 一覧
- Audit の結果（承認/却下）

## 注意事項

- 各ステップは順次実行する（並列不可）。前のステップのジャーナルが次のステップの入力になるため。
- サイクル中にエラーが発生した場合、そのステップで停止し、エラー内容を報告する。途中まで保存されたジャーナルは次回サイクルで参照可能。
- Improve が「提案なし」と判断した場合、Audit はスキップする。
