# @claude-memory/core

ドメイン層。外部依存ゼロ。ビジネスロジックの中心。

## エンティティ

### Memory
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string (UUID) | 一意識別子 |
| content | string | 記憶のテキスト内容（空文字不可） |
| embedding | number[] \| null | 384次元ベクトル。list/findById時はnull |
| metadata | MemoryMetadata | セッションID、プロジェクトパス、タグ、ソース |
| createdAt | Date | 作成日時 |
| updatedAt | Date | 更新日時 |
| lastAccessedAt | Date | 最終アクセス日時（検索ヒット時に更新） |

### SearchResult
| フィールド | 型 | 説明 |
|-----------|-----|------|
| memory | Memory | 記憶本体 |
| score | number | 検索スコア（0-1） |
| matchType | 'keyword' \| 'vector' \| 'hybrid' | マッチ種別 |

## インターフェース

### EmbeddingProvider
- `embed(text: string): Promise<number[]>` — 単一テキストをベクトル化
- `embedBatch(texts: string[]): Promise<number[][]>` — バッチベクトル化（Promise.all並列）
- `getDimension(): number` — ベクトル次元数を返す

### StorageRepository
- `save(memory)` — 保存（upsert）
- `saveBatch(memories[])` — バッチ保存
- `findById(id)` — ID検索（embedding=null）
- `searchByKeyword(query, limit, filter?)` — キーワード検索（pg_bigm）
- `searchByVector(embedding, limit, filter?)` — ベクトル検索（pgvector）
- `list(options)` — 一覧取得（ページネーション）
- `delete(id)` — 削除
- `clear()` — 全削除
- `getStats()` — 統計情報
- `exportAll()` — 全件エクスポート
- `deleteOlderThan(field, days)` — 古い記憶を削除
- `countOlderThan(field, days)` — 古い記憶をカウント

### ChunkingStrategy
- `chunk(conversation: ConversationLog): Chunk[]` — 会話をチャンクに分割

## ユースケース

### SaveMemoryUseCase
保存前に重複チェック（コサイン類似度 >= 0.95）。saveConversationではPromise.allで並列チェック。

### SearchMemoryUseCase
キーワード検索とベクトル検索を並列実行 → RRF (k=60) で統合 → 時間減衰（半減期30日）。

### UpdateMemoryUseCase
content変更時のみ再embedding。tag変更のみならembeddingは保持。

## 定数

| 定数 | 値 | 説明 |
|------|-----|------|
| SEARCH_DEFAULTS.rrfK | 60 | RRFパラメータ |
| SEARCH_DEFAULTS.decayHalfLifeDays | 30 | 時間減衰の半減期 |
| SEARCH_DEFAULTS.maxResults | 20 | デフォルト検索結果数 |
| DEDUP_DEFAULTS.similarityThreshold | 0.95 | 重複判定閾値 |
