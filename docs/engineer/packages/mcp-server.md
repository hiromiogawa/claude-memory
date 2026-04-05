# @claude-memory/mcp-server

MCPサーバー。全パッケージを束ねるエントリポイント。

## DIコンテナ (createContainer)
全ユースケースをインスタンス化し、依存を注入する。

## ツール一覧
10種のMCPツールを公開。詳細は [MCPツールリファレンス](../mcp-tools.md) を参照。

## エラーハンドリング
`handleToolError` ラッパーで全ツールのエラーを統一的に処理。MemoryError系はユーザーフレンドリーなメッセージに変換。

## 設定 (AppConfig)
| 設定 | 環境変数 | デフォルト |
|------|---------|----------|
| databaseUrl | DATABASE_URL | （必須） |
| embeddingModel | EMBEDDING_MODEL | intfloat/multilingual-e5-small |
| embeddingDimension | EMBEDDING_DIMENSION | 384 |
| dbPoolSize | DB_POOL_SIZE | 10 |
| logLevel | LOG_LEVEL | info |
