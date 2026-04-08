# @claude-memory/hooks

## 責務

インターフェース層。Claude Code のセッションフック（開始・終了）を処理し、会話を記憶として保存する。QA チャンキング戦略も提供。

## 依存方向

- 依存先: `@claude-memory/core`（インターフェースと型のみ）
- 依存元: `mcp-server`

## 主要クラス

| クラス | ファイル | 役割 |
|--------|---------|------|
| `SessionStartHandler` | `src/session-start-handler.ts` | セッション開始時に関連記憶を検索・注入 |
| `SessionEndHandler` | `src/session-end-handler.ts` | セッション終了時に会話を記憶として保存 |
| `QAChunkingStrategy` | `src/qa-chunking-strategy.ts` | 会話を Q&A ペアに分割（ChunkingStrategy 実装） |

## コマンド

- `pnpm --filter @claude-memory/hooks test` — テスト
- `pnpm --filter @claude-memory/hooks build` — ビルド

## 制約

- QA チャンク最大サイズ: 1000 文字（日本語の文境界で分割）
- 重要度フィルタリングがデフォルト有効（決定、選定、バグ、エラー等のキーワード）
- JSONL パースはエラー耐性あり（不正行はスキップ）
