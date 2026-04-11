---
name: adr
description: Use when 技術選定・アーキテクチャ変更・代替案比較の末に設計判断を下したとき、design-decision オーケストレーター外で単独記録する場合や既存 ADR を Supersede するとき
---

# ADR（アーキテクチャ決定記録）

## 作成タイミング

- 技術選定（ライブラリ、フレームワーク、DB等）
- アーキテクチャの重要な決定
- 代替案を検討した結果の判断
- 将来の自分やチームメンバーが「なぜこうなっているか」を知りたくなる決定

## ファイル構成

```
docs/adr/
  root/                    # プロジェクト全体の決定
    ADR-001-xxx.md
    ADR-002-xxx.md
  packages/                # パッケージ固有の決定
    core/
      ADR-001-xxx.md
    storage-postgres/
      ADR-001-xxx.md
```

## テンプレート

```markdown
# ADR-XXX: タイトル

## ステータス
Proposed | Accepted | Deprecated | Superseded by ADR-YYY

## コンテキスト
なぜこの決定が必要だったか。背景と制約条件。

## 決定
何を選んだか。具体的に。

## 選択肢

| 選択肢 | メリット | デメリット |
|--------|---------|----------|
| A      |         |          |
| B      |         |          |
| C      |         |          |

## 結果
この決定による影響。何が変わるか。
```

## 命名規則

`ADR-XXX-short-description.md`
- XXX は連番（001, 002, ...）
- root と packages で独立した連番

## ルール

- ADR は **不変** — 変更する場合は新しい ADR で Supersede
- ステータスを更新して「Deprecated」or「Superseded by ADR-YYY」にする
- コミット: `docs(adr): add ADR-XXX for topic`

## よくある間違い

| 間違い | 正しい対応 |
|--------|-----------|
| 既存 ADR を書き換える | ADR は不変。新 ADR で Supersede |
| 選択肢を比較せず結論だけ書く | 却下された代替案と理由こそ ADR の価値 |
| 番号重複 | 作成前に既存最大番号を確認 |
| root と packages の番号を混同 | それぞれ独立した連番 |
| ADR 作成後に memory 保存を忘れる | brainstorming 中なら design-decision を使う |
