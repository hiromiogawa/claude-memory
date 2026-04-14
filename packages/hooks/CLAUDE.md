# @claude-memory/hooks

## 責務

インターフェース層。Claude Code のセッションフック（開始・終了）を処理し、会話を記憶として保存する。QA チャンキング戦略も提供。

## 依存方向

- 依存先: `@claude-memory/core`（インターフェースと型のみ）
- 依存元: `mcp-server`

## 主要 factory

ADR-0008 / ADR-0009 に従い、全て factory function で提供する（class は不使用）。

| factory | 戻り値型 | ファイル | 役割 |
|---------|---------|---------|------|
| `defineSessionStartHandler(searchUseCase)` | `SessionStartHandler` | `src/session-start-handler.ts` | セッション開始時に関連記憶を検索・注入 |
| `defineSessionEndHandler(saveUseCase)` | `SessionEndHandler` | `src/session-end-handler.ts` | セッション終了時に会話を記憶として保存 |
| `defineQAChunkingStrategy(options?)` | `ChunkingStrategy` | `src/qa-chunking-strategy.ts` | 会話を Q&A ペアに分割（ChunkingStrategy 実装） |

## コマンド

- `pnpm --filter @claude-memory/hooks test` — テスト
- `pnpm --filter @claude-memory/hooks build` — ビルド

## 定数

`src/constants.ts` に集約:
- `DEFAULT_MAX_CHUNK_CHARS` (1000) — QA チャンクの最大文字数
- `SESSION_START_SEARCH_LIMIT` (5) — セッション開始時の記憶検索件数

## 制約

- QA チャンク最大サイズ: 1000 文字（日本語の文境界で分割）
- 容量管理は core の `enforceCapacity`（LFU方式）に委譲。チャンキング側でのフィルタリングはしない
- JSONL パースはエラー耐性あり（不正行はスキップ）
