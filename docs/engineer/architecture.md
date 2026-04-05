# アーキテクチャ

## クリーンアーキテクチャ

![クリーンアーキテクチャ](../images/clean-architecture.png)

3層構造で依存方向を厳格に管理する。外側から内側にのみ依存可能。

### Domain Layer — `@claude-memory/core`

外部依存ゼロ。ビジネスロジックの中心。

**エンティティ:**
- `Memory` — 記憶の本体（id, content, embedding, metadata, timestamps）
- `Chunk` — 会話の分割単位（content, metadata）
- `SearchResult` — 検索結果（memory, score, matchType）
- `SearchFilter` — 検索フィルタ（projectPath, source, tags）

**インターフェース（型定義）:**
- `EmbeddingProvider` — `embed()`, `embedBatch()`, `getDimension()`
- `StorageRepository` — `save()`, `searchByKeyword()`, `searchByVector()`, `list()`, `delete()`, `exportAll()`, `deleteOlderThan()`, `countOlderThan()`
- `ChunkingStrategy` — `chunk()`

**ユースケース:**
- `SaveMemoryUseCase` — 保存 + 重複チェック（コサイン類似度 >= 0.95）
- `SearchMemoryUseCase` — ハイブリッド検索（pg_bigm + pgvector → RRF → 時間減衰）
- `UpdateMemoryUseCase` — 更新（content変更時のみ再embedding）
- `DeleteMemoryUseCase` — 削除（存在チェック付き）
- `ListMemoriesUseCase` — 一覧取得（ページネーション、最大100件）
- `ExportMemoryUseCase` — 全記憶をJSON形式でエクスポート
- `ImportMemoryUseCase` — JSONからインポート（embedding再計算）
- `CleanupMemoryUseCase` — 古い記憶の削除（dry-run対応）
- `GetStatsUseCase` — 統計情報取得
- `ClearMemoryUseCase` — 全記憶削除

### Infrastructure Layer

coreのインターフェースを実装する（依存性逆転の原則）。

**`@claude-memory/embedding-onnx`:**
- `OnnxEmbeddingProvider` implements `EmbeddingProvider`
- @huggingface/transformers でローカルONNX推論
- multilingual-e5-small（384次元）がデフォルト
- `embedBatch` は `Promise.all` で並列処理

**`@claude-memory/storage-postgres`:**
- `PostgresStorageRepository` implements `StorageRepository`
- Drizzle ORM + postgres パッケージ
- pgvector: HNSWインデックスによるベクトル近傍検索
- pg_bigm: GINインデックスによる日本語対応キーワード検索
- コネクションプール対応（max=10、`DB_POOL_SIZE`で設定可能）
- 検索ヒット時に `lastAccessedAt` を自動更新（クリーンアップの判定基準）

### Interface Layer

外部との接点。

**`@claude-memory/mcp-server`:**
- MCPツール10種を公開（stdio transport）
- DIコンテナ（`createContainer`）で全パッケージを組み立て・注入
- Pino loggerで構造化ログ
- 操作レイテンシをレスポンスに含む

**`@claude-memory/hooks`:**
- `SessionEndHandler` — PostSessionEndフックのエントリポイント
- `QAChunkingStrategy` implements `ChunkingStrategy` — 会話をQ&Aペアに分割（最大1000文字/チャンク、文境界で分割）

## パッケージ構成

```
packages/
├── core/              ドメイン層（依存ゼロ）
├── embedding-onnx/    ONNX埋め込み実装
├── storage-postgres/  PostgreSQL + pgvector + pg_bigm
├── mcp-server/        MCP Server + DI
└── hooks/             Claude Code Hooks連携
```

各パッケージの詳細ドキュメント:
- [core](packages/core.md) — エンティティ、インターフェース、ユースケース、定数
- [embedding-onnx](packages/embedding-onnx.md) — モデル設定、実装詳細
- [storage-postgres](packages/storage-postgres.md) — 接続設定、インデックス、検索の仕組み
- [mcp-server](packages/mcp-server.md) — DIコンテナ、ツール一覧、設定
- [hooks](packages/hooks.md) — SessionEndHandler、QAChunkingStrategy

## 依存方向

```
mcp-server → embedding-onnx → core
           → storage-postgres → core
           → hooks → core
```

`dependency-cruiser` で自動検証される。違反するとCIおよびpre-commitフックで検出される。

## データベーススキーマ

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(384),
  session_id TEXT,
  project_path TEXT,
  tags TEXT[],
  source TEXT,                    -- 'manual' | 'auto'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 日本語対応キーワード検索
CREATE INDEX idx_memories_bigm ON memories USING gin(content gin_bigm_ops);

-- ベクトル近傍検索
CREATE INDEX idx_memories_vector ON memories USING hnsw(embedding vector_cosine_ops);
```

## 検索アルゴリズム

### ハイブリッド検索

1. クエリをembedding化（384次元ベクトル）
2. キーワード検索（pg_bigm）とベクトル検索（pgvector）を**並列実行**
3. RRF（Reciprocal Rank Fusion, k=60）で両結果を統合
4. 時間減衰を適用: `score *= 0.5^(経過日数 / 30)`
5. スコア順で上位N件を返却

### 重複排除

保存前に最近傍1件のコサイン類似度を検査。閾値（デフォルト0.95）以上なら保存をスキップ。`Promise.all` で全チャンクを並列チェック。
