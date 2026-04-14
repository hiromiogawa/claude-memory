---
name: sdd
description: Markdown 仕様から JSDoc へ Single Source of Truth を段階的に移行し、実装後は型 + JSDoc だけを正として維持する仕様駆動開発フローを提供する。Use when 新機能の設計を始めるとき、仕様書から実装へ移行するとき、または JSDoc / typedoc による仕様記述に迷ったとき
---

# 仕様駆動開発（SDD）

Markdown 仕様書から JSDoc へ Single Source of Truth を段階的に移行し、実装後は型 + JSDoc だけを正として維持する。

## 原則

仕様は **Single Source of Truth (SSoT)** として機能する。

## フロー

### フェーズ 1: 設計（Markdown）

1. `docs/specs/YYYY-MM-DD-<topic>-design.md` に仕様書を作成
2. 仕様書にはアーキテクチャ、エンティティ、インターフェース、データフローを含める
3. レビュー → 承認

### フェーズ 2: 実装（JSDoc への移行）

1. 仕様書の型定義をコードに移行
2. **JSDoc** で仕様をコード内に記述（SSoTの移行）
3. 型 + JSDoc が仕様の正（SSoT）となる

### フェーズ 3: メンテナンス

1. 以降の仕様変更は **JSDoc を直接更新**
2. Markdown 仕様書はアーカイブ（参照用に残す）
3. `typedoc` で API 仕様書を自動生成

## ドキュメント構成

```
docs/
  specs/         # フェーズ 1 の仕様書
  api/           # typedoc 自動生成出力
```

## typedoc

- CIで自動生成（PR時）
- GitHub Pages or `docs/api/` に出力
- JSDoc の `@remarks`, `@example`, `@see` を活用

## よくある間違い

| 間違い | 正しい対応 |
|--------|-----------|
| Markdown 仕様と JSDoc の両方を SSoT 扱い | 実装フェーズ以降は JSDoc が唯一の SSoT |
| 型だけ変更して JSDoc 未更新 | 型と JSDoc は同時更新 |
| 仕様書を残さず実装だけ進める | `docs/specs/` に設計を残してから実装 |
| `@remarks` に制約条件を書かない | 制約は必ず `@remarks`、例は `@example` |

## チェックリスト

- [ ] 仕様書は `docs/specs/` に保存
- [ ] 型定義には JSDoc を記述
- [ ] `@remarks` で制約条件を明記
- [ ] `@example` で使用例を記述
- [ ] typedoc でビルドが通ることを確認
