# MCPツールリファレンス

## memory_save

記憶を手動で保存する。保存前にコサイン類似度 >= 0.95 の重複チェックを行い、重複時はスキップする。

| 引数 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `content` | `string` | Yes | 保存する内容（空文字不可） |
| `sessionId` | `string` | Yes | セッションID |
| `projectPath` | `string` | No | プロジェクトのパス |
| `tags` | `string[]` | No | 検索用タグ |

**戻り値:** `"Memory saved successfully. (12ms)"` / `"Duplicate memory skipped. (8ms)"`

## memory_search

ハイブリッド検索。キーワード検索（pg_bigm）とベクトル検索（pgvector）を並列実行し、RRF（k=60）で統合、時間減衰（半減期30日）を適用。

| 引数 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|----------|------|
| `query` | `string` | Yes | — | 検索クエリ |
| `limit` | `number` | No | `20` | 最大取得件数 |
| `projectPath` | `string` | No | — | プロジェクトパスでフィルタ |
| `tags` | `string[]` | No | — | タグでフィルタ（いずれか一致、PostgreSQL `&&` 演算子） |
| `allProjects` | `boolean` | No | `false` | `true` でprojectPathフィルタを無視し全プロジェクト横断検索 |

**戻り値:** スコア順のリスト。各結果に `matchType`（`keyword` / `vector` / `hybrid`）とスコアが付く。

## memory_list

記憶を一覧取得する（ページネーション対応）。embeddingは返さない（`null`）。

| 引数 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|----------|------|
| `limit` | `number` | No | `20` | 取得件数（最大100） |
| `offset` | `number` | No | `0` | オフセット |
| `source` | `'manual' \| 'auto'` | No | — | 保存元でフィルタ |
| `tags` | `string[]` | No | — | タグでフィルタ |

## memory_update

既存の記憶を更新する。`content` を変更するとembeddingが再計算される。`tags` のみの変更ではembeddingは保持される。

| 引数 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `id` | `string (UUID)` | Yes | 更新対象のID |
| `content` | `string` | No | 新しい内容 |
| `tags` | `string[]` | No | 新しいタグ |

**エラー:** 存在しないIDの場合 `MemoryNotFoundError`

## memory_delete

指定IDの記憶を削除する。

| 引数 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `id` | `string (UUID)` | Yes | 削除対象のID |

**エラー:** 存在しないIDの場合 `MemoryNotFoundError`

## memory_export

全記憶をJSON形式でエクスポートする。embeddingは含まない（再計算可能なため）。バックアップ・マシン移行用。

引数なし。

**戻り値:** JSON配列。各要素: `{ content, metadata: { sessionId, projectPath?, tags?, source }, createdAt }`

## memory_import

JSONバックアップから記憶をインポートする。各記憶のembeddingはインポート時に再計算される。

| 引数 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `data` | `string` | Yes | `memory_export` で出力されたJSON文字列 |

**戻り値:** `"Imported 42 memories."`

**バリデーション:** インポートデータはZodスキーマで検証される。不正な形式の場合はエラー。

## memory_cleanup

一定期間アクセスされていない古い記憶を削除する。`lastAccessedAt`（検索ヒット時に自動更新）を基準にする。

| 引数 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|----------|------|
| `olderThanDays` | `number` | Yes | — | この日数以上アクセスされていない記憶を対象 |
| `dryRun` | `boolean` | No | `true` | `true` でプレビュー（削除しない）。`false` で実削除 |

**戻り値:** `"Would delete 15 memories (not accessed in 90 days)."` / `"Deleted 15 memories (not accessed in 90 days)."`

## memory_stats

記憶ストレージの統計情報を取得する。引数なし。

**戻り値例:**
```
Total memories: 142
  Manual: 45
  Auto: 97
Total sessions: 23
Oldest memory: 2026-03-01T10:00:00.000Z
Newest memory: 2026-04-04T15:30:00.000Z
Average content length: 287.3 chars
Query time: 12ms
```

## memory_clear

全ての記憶を削除する。引数なし。**この操作は取り消せない。**
