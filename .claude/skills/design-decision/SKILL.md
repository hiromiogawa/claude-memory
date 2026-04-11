---
name: design-decision
description: Use when ライブラリ選定・DB設計・アーキテクチャ変更など、後から理由を問われうる設計判断が brainstorming 中に発生したとき
---

# 設計判断

設計上の重要な判断があったとき、ADR と記憶の両方に記録する。

## いつ使うか

- 技術選定、アーキテクチャ変更、アルゴリズム選択などの設計判断があったとき
- superpowers:brainstorming の中で判断が確定したとき
- 「なぜこの方法を選んだのか」を記録すべきとき

## 実行フロー

### Step 1: adr（ADR作成）

**REQUIRED SUB-SKILL:** adr に従い:

1. `docs/adr/` に新規 ADR を作成
2. コンテキスト、検討した選択肢、決定内容、理由を記録
3. ステータスは `Accepted`

ADR 番号は既存の最大番号 + 1。

### Step 2: memory-usage（記憶保存）

**REQUIRED SUB-SKILL:** memory-usage に従い:

```
memory_save content="[判断の要点] — 詳細は docs/adr/NNNN-*.md を参照"
  tags=["design-decision", "[関連技術名]"]
  scope="project"
```

ADR はドキュメントとして詳細を残し、memory は検索インデックスとして要点を残す。

### 完了条件

- [ ] ADR ファイルを作成済み（docs/adr/）
- [ ] 記憶に保存済み（tags: design-decision）
- [ ] ADR と記憶の内容が整合している
