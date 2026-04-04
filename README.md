# claude-memory

Claude Code 向けの長期記憶システム。セッションをまたいで設計判断・バグ解決策・ユーザーの好みなどを記憶し、ハイブリッド検索（キーワード + ベクトル）で関連する記憶を呼び出す。

## 仕組み

```
┌─────────────────────────────────────────────────────┐
│ ホスト（ユーザーのマシン）                              │
│                                                     │
│  Claude Code                                        │
│   ├── MCP Server接続 ──→ docker exec ... node       │
│   │     memory_save / memory_search / ...           │
│   │                                                 │
│   └── PostSessionEnd hook ──→ docker exec ... node  │
│         セッション終了時に会話を自動保存                  │
└──────────────────┬──────────────────────────────────┘
                   │ docker exec
                   ▼
┌─────────────────────────────────────────────────────┐
│ Docker コンテナ                                      │
│                                                     │
│  mcp-server                                         │
│   ├── MCPツール（7種）                                │
│   ├── ONNX埋め込み（multilingual-e5-small, 384次元）   │
│   └── ハイブリッド検索（RRF + 時間減衰）                 │
│                                                     │
│  PostgreSQL 16                                      │
│   ├── pgvector（ベクトル類似度検索）                     │
│   └── pg_bigm（日本語対応キーワード検索）                 │
└─────────────────────────────────────────────────────┘
```

## 記憶の保存タイミング

| タイミング | トリガー | source | 内容 |
|-----------|---------|--------|------|
| **セッション中** | Claude Code が `memory_save` を呼ぶ | `manual` | CLAUDE.md のルールに基づきAIが判断（設計判断、バグ原因、ユーザーの好みなど） |
| **セッション終了時** | `PostSessionEnd` フックが自動実行 | `auto` | 会話をQ&Aペアに分割し、チャンクごとにembedding → DB保存 |

いずれの場合も、コサイン類似度 >= 0.95 の既存記憶がある場合は重複とみなしスキップする。

## 検索の仕組み

```
検索クエリ
   │
   ├──→ pg_bigm キーワード検索（bigm_similarity スコア付き）
   │
   ├──→ pgvector ベクトル検索（コサイン類似度）
   │
   └──→ RRF（Reciprocal Rank Fusion）で統合
         └──→ 時間減衰（半減期30日）を適用
               └──→ スコア順で返却
```

## MCPツール一覧

| ツール | 説明 | 主な引数 |
|--------|------|---------|
| `memory_save` | 記憶を手動保存 | `content`, `sessionId`, `projectPath?`, `tags?` |
| `memory_search` | ハイブリッド検索 | `query`, `limit?`, `projectPath?`, `tags?`, `allProjects?` |
| `memory_list` | 一覧取得（ページネーション） | `limit?`, `offset?`, `source?`, `tags?` |
| `memory_update` | 既存記憶を更新 | `id`, `content?`, `tags?` |
| `memory_delete` | 記憶を削除 | `id` |
| `memory_stats` | 統計情報 | なし |
| `memory_clear` | 全記憶を削除 | なし |

`memory_update` で `content` を変更するとembeddingが再計算される。`tags` のみの変更ではembeddingはそのまま保持。

## セットアップ

### 1. 起動

```bash
git clone https://github.com/hiromiogawa/claude-memory.git
cd claude-memory
docker compose up -d
```

カスタムPostgreSQLイメージ（pgvector + pg_bigm）のビルドとONNXモデルのダウンロードが初回のみ発生する。

### 2. Claude Code設定

`~/.claude/settings.json` に以下を追加：

```json
{
  "mcpServers": {
    "claude-memory": {
      "command": "docker",
      "args": ["exec", "claude-memory-mcp-server-1", "node", "packages/mcp-server/dist/index.js"]
    }
  },
  "hooks": {
    "PostSessionEnd": [{
      "command": "docker exec claude-memory-mcp-server-1 node packages/hooks/dist/index.js"
    }]
  }
}
```

### 3. CLAUDE.md に記憶ルールを追加

プロジェクトの `CLAUDE.md` に記憶の保存ルールを記載する（何を保存すべきか、何を保存しないか）。例：

```markdown
## 記憶ルール
- セッション開始時に memory_search で関連する記憶を検索
- 重要な設計判断とその理由を memory_save で保存
- 一般的な技術知識（公式ドキュメントに書いてあること）は保存しない
```

## パッケージ構成

```
packages/
├── core/              ドメイン層（エンティティ、インターフェース、ユースケース）
├── embedding-onnx/    ONNX埋め込み実装（multilingual-e5-small）
├── storage-postgres/  PostgreSQL + pgvector + pg_bigm
├── mcp-server/        MCP Server + DI
└── hooks/             Claude Code Hooks連携（PostSessionEnd）
```

依存方向: `core` <- `embedding-onnx`, `storage-postgres`, `hooks` <- `mcp-server`

coreパッケージは外部依存ゼロ。インフラ層（embedding, storage）はcoreのインターフェースを実装する。

## 開発

```bash
pnpm install
docker compose -f docker-compose.test.yml up -d   # テストDB起動
pnpm build                                         # 全パッケージビルド
pnpm test                                          # 全テスト実行
pnpm lint                                          # OXLint + Biome
pnpm knip                                          # 未使用コード検出
pnpm dep-check                                     # 依存方向検証
```

## 技術スタック

- **言語**: TypeScript 5.7（strict mode）
- **ランタイム**: Node.js 22+
- **パッケージ管理**: pnpm 10.8（モノレポ）
- **DB**: PostgreSQL 16 + pgvector + pg_bigm
- **埋め込み**: ONNX（@huggingface/transformers, multilingual-e5-small, 384次元）
- **ORM**: Drizzle ORM
- **MCP**: @modelcontextprotocol/sdk
- **テスト**: Vitest
- **品質**: OXLint, Biome, knip, dependency-cruiser
- **Gitフック**: lefthook（pre-commit: lint/format, commit-msg: commitlint）
- **CI**: GitHub Actions
- **コンテナ**: Docker Compose

## ライセンス

MIT
