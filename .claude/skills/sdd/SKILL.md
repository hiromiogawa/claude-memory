---
name: sdd
description: 仕様駆動開発フロー — Markdown 仕様で設計し、JSDoc を SSoT として実装する
---

# 仕様駆動開発（SDD）

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

## チェックリスト

- [ ] 仕様書は `docs/specs/` に保存
- [ ] 型定義には JSDoc を記述
- [ ] `@remarks` で制約条件を明記
- [ ] `@example` で使用例を記述
- [ ] typedoc でビルドが通ることを確認
