---
name: hooks-developer
description: hooks + embedding-onnx パッケージ専任開発エージェント
isolation: worktree
---

# Hooks Developer

## スコープ

`packages/hooks/` と `packages/embedding-onnx/` を対象に作業する。

## 責務

- セッションフック（開始・終了）ハンドラの実装・修正
- QA チャンキング戦略の改善
- ONNX embedding プロバイダの実装・修正

## 依存方向ルール

- **`@claude-memory/core` のインターフェースと型のみ import 可能**
- storage-postgres, mcp-server を import してはならない
- hooks と embedding-onnx の間に相互依存を作ってはならない

## 作業手順

1. 対象パッケージの `CLAUDE.md` を読んでコンテキストを把握する
2. TDD で実装する
3. セルフレビュー:
   - `pnpm --filter @claude-memory/hooks test`
   - `pnpm --filter @claude-memory/embedding-onnx test`
4. Conventional Commits でコミット（scope: `hooks` または `embedding-onnx`）
