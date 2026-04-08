# @claude-memory/storage-postgres

## 責務

インフラ層。core の `StorageRepository` インターフェースを PostgreSQL で実装する。

## 依存方向

- 依存先: `@claude-memory/core`（インターフェースと型のみ）
- 依存元: `mcp-server`

## 主要クラス

| クラス | ファイル | 役割 |
|--------|---------|------|
| `PostgresStorageRepository` | `src/postgres-storage-repository.ts` | StorageRepository 実装 |

## スキーマ

- `src/schema.ts` — Drizzle ORM テーブル定義（memories テーブル）
- `drizzle/` — マイグレーション SQL

## 技術スタック

- **Drizzle ORM** + **postgres** ドライバ
- **pgvector** — HNSW インデックスによるベクトル近傍検索
- **pg_bigm** — GIN インデックスによる日本語キーワード検索

## コマンド

- `pnpm --filter @claude-memory/storage-postgres test` — テスト（要: テスト用 DB）
- `pnpm --filter @claude-memory/storage-postgres build` — ビルド
- `pnpm --filter @claude-memory/storage-postgres db:generate` — マイグレーション生成
- `pnpm --filter @claude-memory/storage-postgres db:migrate` — マイグレーション実行
- `pnpm --filter @claude-memory/storage-postgres db:push` — スキーマ直接プッシュ

## テスト用 DB

```bash
docker compose -f docker-compose.test.yml up -d
# 接続: postgresql://test:test@localhost:5434/claude_memory_test
```

スキーマ適用が必要な場合:
```bash
DATABASE_URL='postgresql://test:test@localhost:5434/claude_memory_test' pnpm --filter @claude-memory/storage-postgres db:push
```

## 定数

`src/constants.ts` に集約:
- `BULK_INSERT_CHUNK_SIZE` (500) — bulk insert のチャンクサイズ
- `DEFAULT_MAX_CONNECTIONS` (10) — コネクションプール最大数

## 制約

- bulk insert は 500 件ごとにチャンク分割（PostgreSQL パラメータ上限対策）
- embedding の SQL キャストは `::vector` が必要
- SQL インジェクション対策: Drizzle の `sql` テンプレートリテラルを使用し、文字列結合は禁止
- コネクションプール最大数はデフォルト 10（`DB_POOL_SIZE` で変更可能）
