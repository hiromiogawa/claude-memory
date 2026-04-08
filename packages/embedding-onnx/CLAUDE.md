# @claude-memory/embedding-onnx

## 責務

インフラ層。core の `EmbeddingProvider` インターフェースを ONNX Runtime で実装する。

## 依存方向

- 依存先: `@claude-memory/core`（インターフェースと型のみ）
- 依存元: `mcp-server`

## 主要クラス

| クラス | ファイル | 役割 |
|--------|---------|------|
| `OnnxEmbeddingProvider` | `src/onnx-embedding-provider.ts` | EmbeddingProvider 実装 |

## 技術スタック

- **@huggingface/transformers** — ONNX モデルのロードと推論
- デフォルトモデル: `intfloat/multilingual-e5-small`（384 次元）

## コマンド

- `pnpm --filter @claude-memory/embedding-onnx test` — テスト
- `pnpm --filter @claude-memory/embedding-onnx build` — ビルド

## 制約

- モデルは遅延初期化（初回 embed 時にダウンロード、`~/.cache/` にキャッシュ）
- 入力上限: 約 512 トークン（日本語で約 1000 文字）
- embedBatch は `Promise.all` で並列処理
