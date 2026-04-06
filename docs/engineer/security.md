# セキュリティ

## SQLインジェクション対策

全てのDBクエリはDrizzle ORMのパラメータバインディングを使用している。ユーザー入力がSQL文に直接結合されることはない。

- `sql.raw()` は排除済み（#43）。全クエリがパラメータ化されている
- LIKE句の特殊文字（`%`, `_`, `\`）はエスケープ処理済み
- タグフィルタは `sql.join()` でパラメータ化した配列を使用

## 入力バリデーション

全MCPツールの引数はZodスキーマで検証される。不正な入力はツール実行前にリジェクトされる。

- `memory_save`: content は `z.string().min(1)` で空文字を禁止
- `memory_delete`, `memory_update`: id は `z.string().uuid()` でUUID形式を強制
- `memory_import`: インポートデータは専用のZodスキーマで構造を検証
- `memory_cleanup`: olderThanDays は `z.number().min(1)` で正の整数を強制

## 認証情報

### デフォルトパスワード

`docker-compose.yml` のDB認証情報はローカル開発用のデフォルト値。

```yaml
environment:
  POSTGRES_USER: memory
  POSTGRES_PASSWORD: memory
```

Docker Composeのネットワーク内でのみアクセス可能（外部公開されていない）だが、本番利用や共有環境では `.env` ファイルで上書きすること。

```bash
# .env
POSTGRES_USER=your_secure_user
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://your_secure_user:your_secure_password@db:5432/claude_memory
```

`.env` は `.gitignore` に含まれており、リポジトリにコミットされない。

### MCP Server の認証

MCP Server は Docker コンテナ内で stdio 通信する。ネットワーク経由のアクセスは不可。`docker exec` でのみアクセスされるため、追加の認証機構は不要。

## データの保存場所

記憶データは Docker volume（`pgdata`）に保存される。

- ホストマシンのファイルシステム上に保存（Docker管理下）
- 外部サーバーへの送信なし
- 埋め込みモデル（ONNX）もコンテナ内でローカル実行
- バックアップは `memory_export` でJSON形式にエクスポート可能

## エラーハンドリング

`handleToolError` ラッパーにより、全MCPツールのエラーが統一的に処理される。

- ドメインエラー（MemoryNotFoundError等）: ユーザーフレンドリーなメッセージで返却
- 予期しないエラー: `Internal error:` プレフィックスで返却（スタックトレースは非公開）
- エラーは Pino logger で構造化ログに記録
