# ルール自動改善サイクル 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** エージェントのルールを自動的に計測・探索・改善提案・検証する 4 つのスキルを追加し、failure-record と連動するイベント駆動の改善サイクルを構築する。

**Architecture:** 4 つの独立したスキル（rule-measure, rule-explore, rule-improve, rule-audit）を作成。各スキルは claude-memory MCP にジャーナルを保存し、次回実行時に前回の判断を引き継ぐ。Improve はファイルを変更せず GitHub Issue を起票し、Audit が精査する。

**Tech Stack:** Claude Code Skills (SKILL.md), claude-memory MCP, GitHub CLI (gh)

---

## File Structure

| ファイル | 責務 |
|---------|------|
| `.claude/skills/rule-measure/SKILL.md` | 計測スキル |
| `.claude/skills/rule-explore/SKILL.md` | 探索スキル |
| `.claude/skills/rule-improve/SKILL.md` | 改善提案スキル |
| `.claude/skills/rule-audit/SKILL.md` | 検証スキル |
| `.claude/skills/failure-record/SKILL.md` | 既存スキルにトリガー条件を追記 |
| `CLAUDE.md` | スキル一覧に 4 件追加 |

---

## Task 1: rule-measure スキル

**Files:**
- Create: `.claude/skills/rule-measure/SKILL.md`

- [ ] **Step 1: SKILL.md を作成**

```markdown
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

```bash
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

```bash
git log --oneline -20  # 直近20コミットを確認
```

以下を集計する:
- pre-commit hook の失敗回数（revert や fix コミットの頻度から推定）
- commitlint 失敗の有無

### 4. ルール総数を集計

```bash
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
```

- [ ] **Step 2: コミット**

```bash
git add .claude/skills/rule-measure/
git commit -m "chore: add rule-measure skill (#135)"
```

---

## Task 2: rule-explore スキル

**Files:**
- Create: `.claude/skills/rule-explore/SKILL.md`

- [ ] **Step 1: SKILL.md を作成**

```markdown
---
name: rule-explore
description: 計測数字だけでは見えないボトルネックや未知のパターンを探索する
---

# ルール探索

計測データだけでは見えないボトルネック、未知のパターン、ルール間の矛盾を探す。

## いつ使うか

- rule-measure の直後（改善サイクルの2番目のステップ）
- 手動で「ルールの問題点を洗い出したい」とき

## 探索手順

### 1. Measure のジャーナルを読む

```bash
memory_search query="rule-journal measure" tags=["rule-journal", "measure"] limit=1
```

最新の計測結果を把握してから探索を開始する。

### 2. 前回の Explore ジャーナルを読む

```bash
memory_search query="rule-journal explore" tags=["rule-journal", "explore"] limit=1
```

前回の探索で見つかった問題が解決されたか確認する。

### 3. スキル間の矛盾・重複を探す

全スキルファイルを読み、以下を確認する:

```bash
ls .claude/skills/*/SKILL.md
```

- 2つのスキルが同じことを違う言い方で指示していないか
- あるスキルの指示が別のスキルと矛盾していないか
- 1つのスキルに統合すべき重複がないか

### 4. エージェント定義のスコープ漏れを探す

```bash
ls .claude/agents/*.md
```

- 依存方向ルールが実際のコードの import と合っているか
- 新しく追加されたファイルやパッケージがスコープから漏れていないか

### 5. ルール化されていないパターンを探す

直近の PR レビューコメントやコミット履歴から、繰り返し指摘されるがルール化されていないパターンを探す:

```bash
# 直近のPRコメントを確認
gh pr list --state merged --limit 10 --json number | jq '.[].number' | xargs -I{} gh api repos/:owner/:repo/pulls/{}/reviews

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
```

- [ ] **Step 2: コミット**

```bash
git add .claude/skills/rule-explore/
git commit -m "chore: add rule-explore skill (#135)"
```

---

## Task 3: rule-improve スキル

**Files:**
- Create: `.claude/skills/rule-improve/SKILL.md`

- [ ] **Step 1: SKILL.md を作成**

```markdown
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

```bash
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

```bash
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
```

- [ ] **Step 2: コミット**

```bash
git add .claude/skills/rule-improve/
git commit -m "chore: add rule-improve skill (#135)"
```

---

## Task 4: rule-audit スキル

**Files:**
- Create: `.claude/skills/rule-audit/SKILL.md`

- [ ] **Step 1: SKILL.md を作成**

```markdown
---
name: rule-audit
description: 改善提案を検証し、承認またはクローズする
---

# ルール検証

rule-improve が起票した改善提案 Issue を精査し、妥当なものを承認、問題があるものをクローズする。

## いつ使うか

- rule-improve の直後（改善サイクルの最終ステップ）
- `rule-improvement` ラベルの未精査 Issue があるとき

## 検証手順

### 1. 未精査の Issue を取得

```bash
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
```bash
gh issue edit [NUMBER] --add-label "approved"
gh issue comment [NUMBER] --body "rule-audit: 検証OK。既存ルールとの矛盾なし、根拠十分。"
```

**クローズする場合**:
```bash
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

```bash
memory_search query="rule-journal" tags=["rule-journal"] limit=50
# 3世代より前のジャーナルを特定して memory_delete
```

## 出力

Issue への承認（`approved` ラベル）またはクローズ（理由コメント付き）。
ジャーナルにサイクル完了を記録する。
```

- [ ] **Step 2: コミット**

```bash
git add .claude/skills/rule-audit/
git commit -m "chore: add rule-audit skill (#135)"
```

---

## Task 5: failure-record スキルにトリガー条件を追記

**Files:**
- Modify: `.claude/skills/failure-record/SKILL.md`

- [ ] **Step 1: failure-record にトリガーセクションを追加**

ファイル末尾に以下を追加:

```markdown

## 改善サイクルのトリガー

FAIL エントリを ADR-0007 に追記した後、前回サイクル実行以降の新規 FAIL エントリ数を確認する。

```bash
# 前回サイクル実行時刻を取得
memory_search query="rule-journal audit cycle-meta" tags=["rule-journal", "cycle-meta"] limit=1

# ADR-0007 の FAIL エントリ数を確認
grep -c "^### FAIL-" docs/adr/0007-agent-failure-rules.md
```

**閾値**: 前回サイクル以降の新規 FAIL エントリが **3 件** に達したら、以下を順次実行する:

1. rule-measure（計測）
2. rule-explore（探索）
3. rule-improve（改善提案 → Issue 起票）
4. rule-audit（検証 → Issue 承認/却下）
```

- [ ] **Step 2: コミット**

```bash
git add .claude/skills/failure-record/
git commit -m "chore: add improvement cycle trigger to failure-record (#135)"
```

---

## Task 6: ルート CLAUDE.md にスキル 4 件を追加

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: スキル一覧に追加**

`## Skills` セクションの `failure-record` 行の後に以下を追加:

```markdown
- rule-measure → ルール効果の定量計測
- rule-explore → ルールのボトルネック・未知パターン探索
- rule-improve → 計測・探索結果からルール改善提案をIssue化
- rule-audit → 改善提案の検証・承認・却下
```

- [ ] **Step 2: コミット**

```bash
git add CLAUDE.md
git commit -m "docs: add rule improvement cycle skills to CLAUDE.md (#135)"
```
