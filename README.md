# claude-memory

Claude Code 向けの長期記憶システム。セッションをまたいで設計判断・バグ解決策・ユーザーの好みなどを記憶し、ハイブリッド検索（キーワード + ベクトル）で関連する記憶を呼び出す。

## 特徴

- **ローカル完結** — 外部APIへの送信なし。埋め込みモデルもDBもDockerコンテナ内で動作
- **ハイブリッド検索** — キーワード検索 + ベクトル類似度をRRFで統合し、時間減衰で新しい記憶を優先
- **自動記憶** — セッション終了時に会話をQ&Aペアに分割して自動保存
- **重複排除** — コサイン類似度 >= 0.95 の記憶は自動スキップ
- **多言語対応** — 日本語・英語どちらでも検索可能

## 全体像

![ユーザーフロー全体像](docs/images/user-flow.png)

## セットアップ

### 前提条件

- Docker / Docker Compose
- Claude Code（CLI / デスクトップ / IDE拡張）

### 1. 起動

```bash
git clone https://github.com/hiromiogawa/claude-memory.git
cd claude-memory
docker compose up -d
```

### 2. Claude Code にMCPサーバーを登録

`~/.claude/settings.json` に追加：

```json
{
  "mcpServers": {
    "claude-memory": {
      "command": "docker",
      "args": [
        "exec",
        "claude-memory-mcp-server-1",
        "node",
        "packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### 3. PostSessionEnd フックを登録

同じ `settings.json` に追加：

```json
{
  "hooks": {
    "PostSessionEnd": [
      {
        "command": "docker exec claude-memory-mcp-server-1 node packages/hooks/dist/index.js"
      }
    ]
  }
}
```

このフックはセッション終了時に自動発火し、会話内容をQ&Aペアに分割してDBに保存する。ユーザーが意識する必要はない。

### 4. CLAUDE.md に記憶ルールを記載

```markdown
## 記憶ルール
- セッション開始時に memory_search で関連する記憶を検索する
- 重要な設計判断、バグ原因、ユーザーの好みを memory_save で保存する
- 一般的な技術知識は保存しない
- 保存時は tags を付けて検索しやすくする
```

## 記憶の保存と検索

### 保存フロー

![保存フロー](docs/images/save-flow.png)

| タイミング | トリガー | source |
|-----------|---------|--------|
| セッション中 | Claude Code が `memory_save` を呼ぶ | `manual` |
| セッション終了時 | PostSessionEnd フックが自動実行 | `auto` |

### 検索パイプライン

![検索パイプライン](docs/images/search-pipeline.png)

## MCPツール一覧

| ツール | 説明 | 主な引数 |
|--------|------|---------|
| `memory_save` | 記憶を保存 | `content`, `sessionId`, `tags?` |
| `memory_search` | ハイブリッド検索 | `query`, `limit?`, `projectPath?`, `tags?`, `allProjects?` |
| `memory_list` | 一覧取得 | `limit?`, `offset?`, `source?`, `tags?` |
| `memory_update` | 記憶を更新 | `id`, `content?`, `tags?` |
| `memory_delete` | 記憶を削除 | `id` |
| `memory_export` | 全記憶をJSONエクスポート | なし |
| `memory_import` | JSONからインポート | `data` |
| `memory_cleanup` | 古い記憶を削除 | `olderThanDays`, `dryRun?` |
| `memory_stats` | 統計情報 | なし |
| `memory_clear` | 全記憶を削除 | なし |

各ツールの詳細な引数・戻り値は [MCPツールリファレンス](docs/engineer/mcp-tools.md) を参照。

## 環境変数

| 変数 | デフォルト | 説明 |
|------|----------|------|
| `DATABASE_URL` | （必須） | PostgreSQL接続URL |
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-small` | 埋め込みモデル名 |
| `EMBEDDING_DIMENSION` | `384` | 埋め込み次元数 |
| `DB_POOL_SIZE` | `10` | DBコネクションプールサイズ |
| `LOG_LEVEL` | `info` | ログレベル |

## 開発者向けドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [アーキテクチャ](docs/engineer/architecture.md) | クリーンアーキテクチャ、パッケージ構成、依存方向 |
| [技術選定](docs/engineer/tech-decisions.md) | 各技術の選定理由と代替案 |
| [MCPツールリファレンス](docs/engineer/mcp-tools.md) | 全ツールの詳細仕様 |
| [運用ルール](docs/engineer/operations.md) | コミット規約、CI、Gitフック、テスト戦略 |

## ライセンス

MIT
