# ADR-0001: CIでのDBスキーマ管理方式

## ステータス

採用

## コンテキスト

CIでテストDBのスキーマを作成する方法として以下の選択肢があった：

1. **raw SQL を直接記述** — CI YAMLにCREATE TABLE文を書く
2. **drizzle-kit push** — schema.tsからスキーマを自動適用
3. **drizzle-kit generate + psql** — マイグレーションSQLを生成してコミット、CIではpsqlで実行

## 決定

**方式3（drizzle-kit generate + psql）** を採用。

## 理由

- **方式1（raw SQL）** は schema.ts とCIのSQLの二重管理が必要で、スキーマ変更時に片方の更新を忘れるリスクがある
- **方式2（drizzle-kit push）** は pnpm の `hoist=false` 設定で `drizzle-orm` をパッケージ内から解決できず、CIで動作しない
- **方式3** は drizzle-kit で生成したSQLをコミットするため、schema.ts が唯一の真実の源（Single Source of Truth）になる。CIではpsqlで実行するだけなので依存解決の問題がない

## 影響

- スキーマ変更時に `pnpm db:generate` を実行してSQLファイルをコミットする手順が必要
- マイグレーションファイルがリポジトリに含まれる（`packages/storage-postgres/drizzle/`）
