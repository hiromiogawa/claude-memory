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

保存前に重複チェックを行い、同じ内容の二重保存を防ぐ。

#### 重複チェックの仕組み（コサイン類似度）

テキストはembeddingにより384個の数値（ベクトル）に変換される。2つのベクトルの「向きの近さ」を0〜1の数値で表したものがコサイン類似度。

```
「TypeScriptで型安全にコードを書く」  → [0.23, 0.87, 0.12, ...] (384次元)
「TypeScriptで型安全にコーディングする」→ [0.24, 0.86, 0.13, ...] (384次元)
  → コサイン類似度: 0.97（ほぼ同じ意味 → 重複と判定、保存スキップ）

「TypeScriptで型安全にコードを書く」  → [0.23, 0.87, 0.12, ...]
「PostgreSQLのインデックス設計」      → [0.65, 0.11, 0.78, ...]
  → コサイン類似度: 0.3（全く異なる内容 → 別の記憶として保存）
```

閾値は `DEDUP_DEFAULTS.similarityThreshold = 0.95`。95%以上似ていたら「実質同一内容」とみなす。

#### saveConversation の並列チェック

セッション終了時のauto保存では複数チャンクを一括保存する。各チャンクの重複チェックを `Promise.all` で並列実行し、N+1問題を回避。

### SearchMemoryUseCase

キーワード検索とベクトル検索を並列実行し、RRFで統合、時間減衰を適用する。

#### 検索パイプライン

```
検索クエリ "TypeScriptの型エラー"
   │
   ├─[1] Embedding: クエリを384次元ベクトルに変換
   │
   ├─[2] キーワード検索 (pg_bigm): テキスト中のクエリ文字列を検索
   │     bigm_similarity() でスコア付け（日本語対応bigram）
   │     結果: [{記憶A, score:0.72}, {記憶B, score:0.45}, ...]
   │
   ├─[3] ベクトル検索 (pgvector): 意味的に近い記憶を検索
   │     コサイン距離でランキング
   │     結果: [{記憶B, score:0.89}, {記憶D, score:0.76}, ...]
   │
   │     ※ [2]と[3]は並列実行
   │
   ├─[4] RRF (Reciprocal Rank Fusion): 2つのランキングを統合
   │     両方のリストに出現する記憶は高スコアになる
   │
   └─[5] 時間減衰: 古い記憶のスコアを下げる
         新しい記憶を優先的に返す
```

#### RRF（Reciprocal Rank Fusion, k=60）

異なる検索手法の結果を公平に統合する方式。各結果のスコアを `1 / (k + 順位)` で計算し、合算する。

```
例: k=60

キーワード検索: 1位=記憶A, 2位=記憶B, 3位=記憶C
ベクトル検索:   1位=記憶B, 2位=記憶D, 3位=記憶A

記憶A: keyword 1/(60+1) + vector 1/(60+3) = 0.0164 + 0.0159 = 0.0323
記憶B: keyword 1/(60+2) + vector 1/(60+1) = 0.0161 + 0.0164 = 0.0325 ← 最高スコア
記憶C: keyword 1/(60+3)                   = 0.0159
記憶D:                    vector 1/(60+2) = 0.0161

→ 結果: 記憶B > 記憶A > 記憶D > 記憶C
  （両方の検索にヒットした記憶Bが最も関連性が高いと判定）
```

k=60 は論文で推奨される標準値。k が大きいほど順位差の影響が小さくなる（結果が均等化される）。

#### 時間減衰（半減期30日）

古い記憶のスコアを指数関数的に下げる。同じ内容でも新しい記憶が優先される。

```
計算式: score × 0.5^(経過日数 / 30)

今日の記憶:     score × 1.0    （そのまま）
30日前の記憶:   score × 0.5    （半分）
60日前の記憶:   score × 0.25   （1/4）
90日前の記憶:   score × 0.125  （1/8）
```

これにより「3ヶ月前に保存した設計判断」より「昨日保存した最新の決定」が上位に来る。ただし完全に消えるわけではなく、他に関連記憶がなければ古い記憶も返される。

### UpdateMemoryUseCase

content変更時のみ再embedding。tag変更のみならembeddingは保持。

## 定数

| 定数 | 値 | 説明 |
|------|-----|------|
| `SEARCH_DEFAULTS.rrfK` | 60 | RRFの統合パラメータ。大きいほど順位差の影響が小さくなる |
| `SEARCH_DEFAULTS.decayHalfLifeDays` | 30 | 時間減衰の半減期。30日でスコアが半分になる |
| `SEARCH_DEFAULTS.maxResults` | 20 | デフォルトの検索結果件数上限 |
| `DEDUP_DEFAULTS.similarityThreshold` | 0.95 | 重複判定の閾値。95%以上似ていたら同一内容とみなす |
