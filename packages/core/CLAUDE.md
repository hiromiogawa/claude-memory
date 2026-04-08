# @claude-memory/core

## 責務

ドメイン層。ビジネスロジックとインターフェース定義の中心。外部依存ゼロ。

## 依存方向

- 依存先: なし（依存ゼロが必須条件）
- 依存元: storage-postgres, embedding-onnx, hooks, mcp-server

core が外部パッケージを import することは禁止。dependency-cruiser で自動検証される。

## 主要インターフェース

| インターフェース | ファイル | 役割 |
|----------------|---------|------|
| `StorageRepository` | `src/interfaces/storage-repository.ts` | 永続化レイヤー抽象 |
| `EmbeddingProvider` | `src/interfaces/embedding-provider.ts` | ベクトル生成抽象 |
| `ChunkingStrategy` | `src/interfaces/chunking-strategy.ts` | 会話分割抽象 |

## 主要エンティティ

| エンティティ | ファイル |
|-------------|---------|
| `Memory`, `MemoryMetadata`, `ListOptions`, `StorageStats` | `src/entities/memory.ts` |
| `SearchResult`, `SearchFilter` | `src/entities/search-result.ts` |
| `Chunk` | `src/entities/chunk.ts` |
| `ConversationLog`, `ConversationMessage` | `src/entities/conversation.ts` |

## ユースケース

`src/use-cases/` 配下に10個: Save, Search, Update, Delete, List, Export, Import, Cleanup, GetStats, Clear

## 定数

`src/constants.ts` に検索・重複排除・容量管理のデフォルト値を集約。

## コマンド

- `pnpm --filter @claude-memory/core test` — ユニットテスト
- `pnpm --filter @claude-memory/core build` — ビルド

## 制約

- 外部パッケージ（npm）への依存追加は原則禁止
- 型定義変更時は JSDoc も同時に更新する
- インターフェース変更は全実装パッケージに影響するため慎重に
