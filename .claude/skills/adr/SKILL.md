---
name: adr
description: アーキテクチャ決定記録（ADR）の作成と管理
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
