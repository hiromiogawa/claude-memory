---
name: diagram-management
description: draw.io diagram conventions and CI auto-generation
---

# Diagram Management

## Diagram Types

| Type | Location | Purpose |
|------|----------|---------|
| Architecture | `docs/diagrams/architecture.drawio` | パッケージ構成・依存関係 |
| Data Flow | `docs/diagrams/data-flow.drawio` | 保存・検索・Hooksフロー |
| Harness | `docs/diagrams/harness.drawio` | ハーネスエンジニアリング構造 |
| Dependency Graph | `docs/diagrams/dependency-graph.svg` | dependency-cruiser 自動生成 |

## draw.io Conventions

- 1ファイルに複数ページ可（タブで切り替え）
- 色分け: Domain=青, Infrastructure=緑, Interface=赤, Interface型=黄, UseCase=紫
- 凡例を必ず含める

## When to Update

- パッケージの追加・削除
- 依存関係の変更
- データフローの変更
- アーキテクチャの重要な変更

**ルール: コードを変更したら図も更新する**

## CI Auto-Generation

### draw.io → PNG

```yaml
# .github/workflows/docs.yml
- uses: rlespinasse/drawio-export-action@v2
  with:
    path: docs/diagrams
    format: png
    output: docs/images
```

### dependency-cruiser → SVG

```yaml
- run: npx depcruise --output-type dot packages/ | dot -T svg > docs/diagrams/dependency-graph.svg
```

Both run on every PR and commit to `docs/images/` and `docs/diagrams/`.

## Viewing

- SVG: GitHub で直接プレビュー可能
- PNG: GitHub で直接プレビュー可能
- draw.io: app.diagrams.net or VS Code 拡張で編集
