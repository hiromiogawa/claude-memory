---
name: post-review
description: レビュー後のオーケストレーター。レビュー指摘への対応→失敗記録→ルール改善サイクルを統括する。superpowers:receiving-code-review の後に呼び出す。
---

# レビュー後対応

コードレビューの指摘を受けた後の対応を統括する。

## いつ使うか

- コードレビューで指摘を受けたとき
- superpowers:receiving-code-review の後に実行する

## 実行フロー

### Step 1: 指摘の分類

レビュー指摘を以下に分類する:

- **修正必須**: バグ、セキュリティ、設計上の問題 → 即座に修正
- **改善提案**: リファクタ、命名改善 → 判断して対応
- **エージェントのミス**: ルール違反、コンテキスト不足による誤り → failure-record 対象

### Step 2: 修正の実施

指摘に対応し、dev-complete スキルの Step 1-3（self-review → docs-freshness → conventional-commits）を再実行する。

### Step 3: failure-record（失敗記録）

エージェントのミスに該当する指摘があった場合、failure-record スキルを実行する:

1. ADR-0007 に FAIL エントリを追記
2. 該当スキル/CLAUDE.md にルールを反映
3. rule-cycle を呼び出す（閾値チェック付き）

### Step 4: rule-cycle（改善サイクル）

failure-record が rule-cycle を呼び出し、閾値に達していればサイクルが自動実行される。

### 完了条件

- [ ] レビュー指摘に全て対応済み
- [ ] self-review 再実行パス
- [ ] エージェントのミスがあれば failure-record 済み
