# claude-memory

Claude Code 向けの長期記憶システム。セッションをまたいで設計判断・バグ解決策・ユーザーの好みなどを記憶し、ハイブリッド検索（キーワード + ベクトル）で関連する記憶を呼び出す。

## 特徴

- **ローカル完結** — 外部APIへの送信なし。埋め込みモデル（ONNX）もDB（PostgreSQL）もDockerコンテナ内で動作
- **ハイブリッド検索** — pg_bigm（日本語対応キーワード検索）+ pgvector（ベクトル類似度）をRRFで統合
- **自動記憶** — セッション終了時にPostSessionEndフックが会話をQ&Aペアに分割して自動保存
- **重複排除** — コサイン類似度 >= 0.95 の既存記憶は保存をスキップ
- **多言語対応** — multilingual-e5-small モデルにより日本語・英語どちらでも検索可能

## アーキテクチャ

```
┌──────────────────────────────────────────────────────────┐
│ ホスト（ユーザーのマシン）                                    │
│                                                          │
│  Claude Code                                             │
│   │                                                      │
│   ├─ MCP接続 ─────────────→ docker exec ... node         │
│   │  memory_save / search    packages/mcp-server/dist    │
│   │  / list / update / ...                               │
│   │                                                      │
│   └─ PostSessionEnd hook ─→ docker exec ... node         │
│      セッション終了時に発火     packages/hooks/dist          │
│      会話ログをJSONLで読み取り                                │
│      Q&Aペアに分割して自動保存                                │
└────────────────────┬─────────────────────────────────────┘
                     │ docker exec（コンテナ内プロセスを起動）
                     ▼
┌──────────────────────────────────────────────────────────┐
│ Docker コンテナ                                           │
│                                                          │
│  mcp-server コンテナ                                      │
│   ├─ MCPツール 7種                                        │
│   ├─ ONNX埋め込み（multilingual-e5-small, 384次元）         │
│   ├─ ハイブリッド検索エンジン                                 │
│   │   ├─ pg_bigm キーワード検索（bigm_similarity スコア）    │
│   │   ├─ pgvector ベクトル検索（コサイン類似度）              │
│   │   └─ RRF統合 + 時間減衰（半減期30日）                    │
│   └─ 重複排除（コサイン類似度 >= 0.95 でスキップ）             │
│                                                          │
│  PostgreSQL 16 コンテナ                                    │
│   ├─ pgvector 拡張（ベクトル型 + HNSWインデックス）           │
│   └─ pg_bigm 拡張（日本語bigramインデックス）                 │
└──────────────────────────────────────────────────────────┘
```

## クイックスタート

### 前提条件

- Docker / Docker Compose
- Claude Code（CLI or デスクトップ）

### 1. リポジトリをクローン

```bash
git clone https://github.com/hiromiogawa/claude-memory.git
cd claude-memory
```

### 2. コンテナを起動

```bash
docker compose up -d
```

初回起動時に以下が自動で行われる：
- カスタムPostgreSQLイメージのビルド（pgvector + pg_bigm）
- MCP Serverイメージのビルド（Node.js 22 + 全パッケージビルド）
- ONNXモデル（multilingual-e5-small, 約100MB）のダウンロードとキャッシュ

起動確認：

```bash
docker compose ps
# db         ... healthy
# mcp-server ... running
```

### 3. Claude Code にMCPサーバーを登録

`~/.claude/settings.json`（グローバル設定）または プロジェクトの `.claude/settings.json` に追加：

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

登録後、Claude Codeを再起動すると `memory_save`, `memory_search` 等のツールが使えるようになる。

### 4. PostSessionEnd フックを登録

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

このフックは **Claude Codeのセッション（会話）が終了するたびに** 自動的に発火する。具体的には：

1. Claude Codeがセッションのログファイル（JSONL形式）を書き出す
2. フックコマンドが実行される
3. `SessionEndHandler` がログを読み取り、Q&Aペアに分割
4. 各チャンクをembedding → 重複チェック → DBに保存

ユーザーが意識する必要はなく、会話を終了するだけで自動的に記憶が蓄積される。

### 5. CLAUDE.md に記憶ルールを記載

プロジェクトの `CLAUDE.md` にAIへの指示を追加する。これにより、Claude Codeが会話中に `memory_save` を適切なタイミングで呼ぶようになる。

```markdown
## 記憶ルール（memory_save / memory_search）
- セッション開始時に memory_search で現在のプロジェクトに関連する記憶を検索し、文脈を把握する
- 以下の情報は自動的に memory_save で保存する（ユーザーに確認不要）：
  - 重要な設計判断とその理由
  - ユーザーの好み・作業スタイル
  - バグの原因と解決策
  - プロジェクト固有の知識（アーキテクチャ、制約、ルール）
  - 議論の結論や合意事項
- 一般的な技術知識（公式ドキュメントに書いてあること）は保存しない
- 保存時は tags を付けて検索しやすくする
```

## 記憶の保存と検索

### 保存タイミング

記憶が保存されるタイミングは **2つだけ**：

| タイミング | トリガー | source | 誰が判断するか |
|-----------|---------|--------|--------------|
| セッション中 | Claude Codeが `memory_save` MCPツールを呼ぶ | `manual` | AI（CLAUDE.mdのルールに基づく） |
| セッション終了時 | `PostSessionEnd` フックが自動実行 | `auto` | 自動（全会話が対象） |

### 重複排除

どちらの保存パスでも、保存前に重複チェックが行われる：

1. 保存しようとする内容のembeddingベクトルを生成
2. DBから最も近い既存記憶を1件検索（コサイン類似度）
3. 類似度 >= 0.95 なら「実質同一内容」とみなし保存をスキップ

閾値はコード上で変更可能（`DEDUP_DEFAULTS.similarityThreshold`）。

### 検索の仕組み

`memory_search` を呼ぶと、以下のパイプラインが実行される：

```
検索クエリ "TypeScriptの型エラー"
   │
   ├──→ [1] クエリをembedding化（384次元ベクトル）
   │
   ├──→ [2] キーワード検索（pg_bigm）
   │     LIKE '%TypeScript%' でフィルタ → bigm_similarity でスコア付け
   │     → 結果: [{memory, score: 0.72}, {memory, score: 0.45}, ...]
   │
   ├──→ [3] ベクトル検索（pgvector）
   │     コサイン類似度で近傍検索
   │     → 結果: [{memory, score: 0.89}, {memory, score: 0.76}, ...]
   │
   └──→ [4] RRF（Reciprocal Rank Fusion）
         k=60 で両方のランキングを統合
         │
         └──→ [5] 時間減衰
               score *= 0.5^(経過日数 / 30)
               新しい記憶ほどスコアが高くなる
               │
               └──→ スコア順で上位N件を返却
```

[2]と[3]は並列実行される。

## MCPツールリファレンス

### `memory_save`

記憶を手動で保存する。

| 引数 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `content` | `string` | Yes | 保存する内容（空文字不可） |
| `sessionId` | `string` | Yes | セッションID |
| `projectPath` | `string` | No | プロジェクトのパス |
| `tags` | `string[]` | No | 検索用タグ |

**戻り値:** 保存成功時 `"Memory saved successfully."`、重複時 `"Duplicate memory skipped."`

### `memory_search`

ハイブリッド検索（キーワード + ベクトル + RRF + 時間減衰）で記憶を検索する。

| 引数 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|----------|------|
| `query` | `string` | Yes | — | 検索クエリ |
| `limit` | `number` | No | `20` | 最大取得件数 |
| `projectPath` | `string` | No | — | プロジェクトパスでフィルタ |
| `tags` | `string[]` | No | — | タグでフィルタ（いずれか一致） |
| `allProjects` | `boolean` | No | `false` | `true` でprojectPathフィルタを無視し全プロジェクト横断検索 |

**戻り値:** スコア順のリスト。各結果に `matchType`（`keyword` / `vector` / `hybrid`）とスコアが付く。

### `memory_list`

記憶を一覧取得する（ページネーション対応）。

| 引数 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|----------|------|
| `limit` | `number` | No | `20` | 取得件数（最大100） |
| `offset` | `number` | No | `0` | オフセット |
| `source` | `'manual' \| 'auto'` | No | — | 保存元でフィルタ |
| `tags` | `string[]` | No | — | タグでフィルタ |

### `memory_update`

既存の記憶を更新する。`content` を変更するとembeddingが再計算される。`tags` のみの変更ではembeddingは保持。

| 引数 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `id` | `string (UUID)` | Yes | 更新対象のID |
| `content` | `string` | No | 新しい内容 |
| `tags` | `string[]` | No | 新しいタグ |

### `memory_delete`

指定IDの記憶を削除する。存在しないIDの場合はエラー。

| 引数 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `id` | `string (UUID)` | Yes | 削除対象のID |

### `memory_stats`

記憶ストレージの統計情報を取得する。引数なし。

**戻り値例:**
```
Total memories: 142
Total sessions: 23
Oldest memory: 2026-03-01T10:00:00.000Z
Newest memory: 2026-04-04T15:30:00.000Z
Average content length: 287.3 chars
```

### `memory_clear`

全ての記憶を削除する。引数なし。**この操作は取り消せない。**

## フック詳細

### PostSessionEnd

Claude Codeのセッション（会話）が終了するたびに発火する。

**発火タイミング:**
- ユーザーが `/exit` で会話を終了したとき
- Claude Codeのウィンドウ/タブを閉じたとき
- セッションがタイムアウトしたとき

**処理フロー:**

```
1. Claude Codeがセッション終了を検知
   │
2. settings.json の hooks.PostSessionEnd のコマンドを実行
   │  docker exec claude-memory-mcp-server-1 node packages/hooks/dist/index.js
   │
3. SessionEndHandler が会話ログ（JSONL）を読み取り
   │  各行: { "role": "user"|"assistant", "content": "...", "timestamp": "..." }
   │
4. QAChunkingStrategy が会話をQ&Aペアに分割
   │  "Q: ユーザーの質問\nA: アシスタントの回答"
   │  1チャンク最大1000文字。超えた場合は文境界で分割
   │
5. 各チャンクに対して:
   │  a. embeddingベクトルを生成（384次元）
   │  b. 重複チェック（コサイン類似度 >= 0.95 ならスキップ）
   │  c. DBに保存（source: 'auto'）
   │
6. 完了（ログ出力なし、バックグラウンドで静かに動作）
```

## 環境変数

| 変数 | デフォルト | 説明 |
|------|----------|------|
| `DATABASE_URL` | （必須） | PostgreSQL接続URL |
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-small` | 埋め込みモデル名 |
| `EMBEDDING_DIMENSION` | `384` | 埋め込み次元数 |
| `LOG_LEVEL` | `info` | ログレベル（debug, info, warn, error） |

利用可能な埋め込みモデル：

| モデル | 次元 | サイズ |
|--------|------|--------|
| `intfloat/multilingual-e5-small` | 384 | ~100MB |
| `intfloat/multilingual-e5-base` | 768 | ~300MB |
| `intfloat/multilingual-e5-large` | 1024 | ~500MB |

モデルを変更する場合は `docker-compose.yml` の `EMBEDDING_MODEL` と `EMBEDDING_DIMENSION` を両方変更し、コンテナを再ビルドする。

## パッケージ構成

```
packages/
├── core/              ドメイン層（エンティティ、インターフェース、ユースケース）
│                      外部依存ゼロ。ビジネスロジックの中心
├── embedding-onnx/    ONNX埋め込み実装
│                      @huggingface/transformers でローカル推論
├── storage-postgres/  PostgreSQL + pgvector + pg_bigm
│                      Drizzle ORMでクエリ構築
├── mcp-server/        MCP Server + DI コンテナ
│                      全パッケージを束ねるエントリポイント
└── hooks/             Claude Code Hooks連携
                       PostSessionEnd で会話を自動保存
```

**依存方向（外側 → 内側にのみ依存可能）:**

```
mcp-server → embedding-onnx
           → storage-postgres  → core
           → hooks             → core
```

`core` は他のパッケージに一切依存しない。インフラ層（embedding, storage）は `core` で定義されたインターフェースを実装する（依存性逆転の原則）。この方向性は `dependency-cruiser` で自動検証される。

## 開発

### セットアップ

```bash
pnpm install
docker compose -f docker-compose.test.yml up -d   # テストDB起動（ポート5434）
```

### コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm build` | 全パッケージをビルド |
| `pnpm test` | 全テスト実行 |
| `pnpm lint` | OXLint + Biome |
| `pnpm knip` | 未使用コード検出 |
| `pnpm dep-check` | パッケージ間の依存方向検証 |

### Gitフック（husky + lint-staged）

| フック | 実行内容 |
|--------|---------|
| `pre-commit` | lint-staged（biome + oxlint をステージファイルに実行）, knip, dep-check |
| `commit-msg` | commitlint（Conventional Commits準拠チェック） |
| `pre-push` | knip（未使用コード検出） |

### コミット規約

[Conventional Commits](https://www.conventionalcommits.org/) に従う。スコープはパッケージ名：

```
feat(core): add UpdateMemoryUseCase
fix(storage-postgres): escape LIKE special chars
perf(embedding-onnx): parallelize embedBatch
docs: add comprehensive README
```

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 言語 | TypeScript 5.7（strict mode） |
| ランタイム | Node.js 22+ |
| パッケージ管理 | pnpm 10.8（モノレポ、hoist=false） |
| DB | PostgreSQL 16 + pgvector + pg_bigm |
| 埋め込み | ONNX（@huggingface/transformers） |
| ORM | Drizzle ORM + Drizzle Kit |
| MCP | @modelcontextprotocol/sdk |
| テスト | Vitest |
| Lint/Format | OXLint, Biome |
| 未使用コード検出 | knip |
| 依存方向検証 | dependency-cruiser |
| Gitフック | husky + lint-staged |
| CI | GitHub Actions |
| コンテナ | Docker Compose |

## ライセンス

MIT
