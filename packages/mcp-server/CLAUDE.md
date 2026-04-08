# @claude-memory/mcp-server

## 責務

インターフェース層。MCP プロトコルで 10 種のメモリ操作ツールを公開する。DI コンテナで全パッケージを組み立てる統合ハブ。

## 依存方向

- 依存先: `core`, `storage-postgres`, `embedding-onnx`, `hooks`
- 依存元: なし（エントリポイント）

## 構成

| ファイル | 役割 |
|---------|------|
| `src/index.ts` | エントリポイント（startServer） |
| `src/server.ts` | MCP サーバー定義、ツール登録 |
| `src/container.ts` | DI コンテナ（createContainer） |
| `src/config.ts` | 環境変数からの設定読み込み |
| `src/tools/*.ts` | 各ツールのハンドラ（10 ファイル） |
| `src/session-start.ts` | セッション開始時のコンテキスト注入 |

## MCP ツール一覧

memory-save, memory-search, memory-list, memory-update, memory-delete, memory-export, memory-import, memory-cleanup, memory-clear, memory-stats

詳細仕様: [docs/generated/mcp-tools.md](../../docs/generated/mcp-tools.md)（自動生成）

## コマンド

- `pnpm --filter @claude-memory/mcp-server test` — テスト
- `pnpm --filter @claude-memory/mcp-server build` — ビルド
- `pnpm --filter @claude-memory/mcp-server start` — MCP サーバー起動
- `pnpm --filter @claude-memory/mcp-server docs:generate` — ツールドキュメント自動生成

## 制約

- トランスポートは stdio のみ（HTTP/WebSocket 非対応）
- Pino ロガーで構造化ログ出力
- ツール追加時は `src/tools/tool-metadata.ts` にメタデータを定義し、`docs:generate` でドキュメントを再生成する
