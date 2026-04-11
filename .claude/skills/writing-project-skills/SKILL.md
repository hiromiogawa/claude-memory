---
name: writing-project-skills
description: Use when このプロジェクトで新しい skill を追加・編集するとき、既存 skill を点検するとき、または skill の description や構造に迷ったとき
---

# プロジェクト skill 作成規約

このプロジェクトの `.claude/skills/` 配下に置く skill の標準。公式 `superpowers:writing-skills` のプロジェクト特化版。

**REQUIRED BACKGROUND:** skill 設計の一般原則は superpowers:writing-skills を参照。本スキルはそれに従った上でのプロジェクト固有ルール。

## 必須フロントマター

```yaml
---
name: skill-name
description: Use when [トリガー条件のみ]
---
```

- `name`: 英数ハイフンのみ。動詞始まり推奨（`writing-x`, `creating-y`）
- `description`: **「Use when」で始める**。トリガー条件・症状・キーワードのみ
- 最大 1024 字。通常 200 字以内

## description アンチパターン

| NG | 理由 |
|----|------|
| `XXX の管理` / `XXX の設定ガイド` | 体言止めはトリガーにならない |
| `A → B → C を順次実行する` | ワークフロー要約。Claude が本文を読まずここに従ってしまう |
| `〜のオーケストレーター` | 機能説明で、いつ使うかが不明 |
| `設計判断を記録する` | 動詞で終わっても What。`〜したとき` で終える |

## 必須構造

```markdown
# スキル名

1-2文の Overview（何のための skill か、core principle）。

## いつ使うか

- トリガー条件
- 併用スキル（あれば）

## 実行フロー or Quick Reference

手順が重要 → 番号付きステップ
選択肢・対応表が重要 → マークダウンテーブル

## よくある間違い

| 間違い | 正しい対応 |
|--------|-----------|
| ... | ... |

## 完了条件（実行型の場合）

- [ ] チェックリスト
```

- 語数目安: 500 語以内
- 例は 1 つで良い。多言語版や generic テンプレは書かない
- 物語（「〇〇したときに〜〜した」）は書かない

## オーケストレーター規約

複数 skill を順次実行する skill（`dev-start`, `dev-complete`, `design-decision`, `post-review`, `rule-cycle`, `project-bootstrap` 系）は以下に従う:

- 各 step を `### Step N: skill-name（役割）` で見出し
- サブスキル呼び出しは `**REQUIRED SUB-SKILL:** skill-name に従い` で明示
- `## 完了条件` セクションで全 step のチェックリストを提示
- description に「A→B→C を順次実行」等のワークフロー要約を書かない

## Discipline skill の追加要件

規律を強制する skill（検証・失敗記録・TDD 系）は以下を含める:

- **Red Flags** セクション: 違反寸前の思考パターン一覧
- **合理化テーブル**: 「この excuse を使いたくなったら、実態はこう」という対応表
- 「例外なし」の明示（「忙しい」「簡単だから」等を事前に塞ぐ）

## プロジェクト固有の参照

- `.project-config.yml` を参照する skill はパス直書きではなく「値は `.project-config.yml` を参照」と書く
- `docs/adr/` `docs/specs/` `docs/generated/` 等のパスはこのプロジェクトの既存構造に従う
- パッケージスコープ: `core`, `embedding-onnx`, `storage-postgres`, `mcp-server`, `hooks`

## 作成・編集フロー

1. **RED**: skill 無しで同じタスクをサブエージェントに投げて失敗を観察（discipline 系のみ必須）
2. **GREEN**: このテンプレに沿って SKILL.md を作成
3. **REFACTOR**: 本チェックリストで自己点検
4. `CLAUDE.md` の `## Skills` セクションに 1 行ポインタを追加
5. `conventional-commits` に従い `docs(skills): add <name> skill` でコミット

## チェックリスト

- [ ] `name` は動詞始まり・英数ハイフンのみ
- [ ] `description` が「Use when」で始まりトリガーのみ
- [ ] description にワークフロー要約が無い
- [ ] 冒頭に 1-2 文の Overview
- [ ] 「いつ使うか」セクションがある
- [ ] 「よくある間違い」セクションがある（単なるリファレンス skill を除く）
- [ ] 一人称・物語的記述が無い
- [ ] 500 語以内
- [ ] オーケストレーターなら `**REQUIRED SUB-SKILL:**` マーカー付き
- [ ] Discipline skill なら Red Flags / 合理化テーブル付き
- [ ] `CLAUDE.md` に 1 行ポインタを追加した

## よくある間違い

| 間違い | 正しい対応 |
|--------|-----------|
| description に「〜のオーケストレーター。A→B→C を実行」と書く | トリガー条件のみ。手順は本文へ |
| 本文にサブスキル名だけ書いて REQUIRED マーカー無し | `**REQUIRED SUB-SKILL:**` を明示 |
| 既存 skill と重複するトリガーを持たせる | 棲み分けを description に書く（例: `adr` の「design-decision 外で単独記録するとき」） |
| skill 本文に narrative（「〇〇したときに〜した」） | 再利用可能な pattern/technique/reference のみ |
| 複数言語で同じ例を書く | 1 つの優れた例で十分 |
| skill ファイル作成後に CLAUDE.md を更新し忘れる | チェックリストで担保 |
