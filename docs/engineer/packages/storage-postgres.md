# @claude-memory/storage-postgres

PostgreSQL実装。Drizzle ORMでクエリ構築。

## PostgresStorageRepository

### 接続設定
| オプション | デフォルト | 環境変数 | 説明 |
|-----------|----------|---------|------|
| connectionString | （必須） | DATABASE_URL | PostgreSQL接続URL |
| maxConnections | 10 | DB_POOL_SIZE | コネクションプールサイズ |

### インデックス
| インデックス | 型 | 用途 |
|-------------|-----|------|
| idx_memories_vector | HNSW (vector_cosine_ops) | ベクトル近傍検索 |
| idx_memories_bigm | GIN (gin_bigm_ops) | 日本語キーワード検索 |

### キーワード検索の仕組み
1. `LIKE '%query%'` でフィルタ（特殊文字はエスケープ）
2. `bigm_similarity()` でスコア付け
3. スコア降順でソート

### ベクトル検索の仕組み
1. `<=>` 演算子でコサイン距離を計算
2. HNSW indexで高速近傍検索
3. スコア = 1 - distance

### lastAccessedAt
検索ヒット時に `touchLastAccessed()` で自動更新。クリーンアップの判定基準に使用。
