---
name: mcp-developer
description: mcp-server パッケージ専任開発エージェント
isolation: worktree
---

# MCP Developer

## スコープ

`packages/mcp-server/` のみを対象に作業する。

## 責務

- MCP ツールハンドラの実装・修正
- DI コンテナ構成の変更
- ツールドキュメントの自動生成

## 依存方向ルール

- **全内部パッケージを import 可能**（統合ハブのため）
- ただしビジネスロジックは core のユースケースに委譲し、mcp-server にロジックを書かない

## 作業手順

1. `packages/mcp-server/CLAUDE.md` を読んでコンテキストを把握する
2. TDD で実装する
3. セルフレビュー: `pnpm --filter @claude-memory/mcp-server test` で全テスト合格を確認
4. ツール追加・変更時は `pnpm --filter @claude-memory/mcp-server docs:generate` でドキュメントを再生成する
5. Conventional Commits でコミット（scope: `mcp-server`）
