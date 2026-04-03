# Claude Memory — 設計書

## 概要

Claude Code にセッション間の長期記憶機能を追加する MCP Server。
セッション終了時に会話を自動保存し、次回セッションで過去の文脈を検索・参照できる。

**目的:**
- セッション間で過去の会話文脈を保持する
- キーワード + ベクトルのハイブリッド検索で関連記憶を高精度に呼び出す
- GitHub公開し、友達にも `docker compose up` で配布できる形にする
- Windows / Mac / Linux クロスプラットフォーム対応

---

## アーキテクチャ

### パッケージ構成（monorepo）

```
claude-memory/
├── packages/
│   ├── core/                  # ドメイン + ユースケース（依存ゼロ）
│   ├── embedding-onnx/        # @huggingface/transformers ONNX実装
│   ├── storage-postgres/      # PostgreSQL + pgvector実装
│   ├── mcp-server/            # Composition Root + MCPツール6つ
│   └── hooks/                 # Claude Code Hooks連携CLI
├── docker-compose.yml
├── docker-compose.test.yml
├── Dockerfile
├── pnpm-workspace.yaml
├── .npmrc
├── .project-config.yml
├── CLAUDE.md
└── docs/
    ├── specs/
    ├── adr/
    │   ├── root/
    │   └── packages/
    └── diagrams/
```

### 依存の方向

```
core  ←──  embedding-onnx      (implements EmbeddingProvider)
  ↑
  ├────  storage-postgres       (implements StorageRepository)
  ↑
mcp-server  ──→  全パッケージを束ねる Composition Root
  ↑
hooks  ──→  core を直接利用
```

- `core` は他パッケージに一切依存しない（pure TypeScript）
- `embedding-onnx`, `storage-postgres` は `core` の interface を実装
- `mcp-server` が全部を組み立てる DI コンテナ的役割
- `hooks` はセッション終了時に発火するスクリプト
- 依存方向は `dependency-cruiser` で CI 時に強制検証

### 設計原則

- クリーンアーキテクチャ: ドメイン層 → インフラ層 → インターフェース層
- 埋め込みモデル・ストレージ・チャンク戦略はすべて interface で抽象化し差し替え可能
- AI の進化に合わせてモデルを差し替えられる設計

---

## core パッケージ（ドメイン層）

### エンティティ

```typescript
/**
 * 記憶の最小単位。1つのQ&Aペアに対応する。
 *
 * @remarks
 * - `content` は空文字を許容しない
 * - `embedding` の次元数は EmbeddingProvider に依存
 */
export interface Memory {
  /** UUID v4 */
  id: string
  /** Q&Aペアのテキスト。空文字不可 */
  content: string
  /** ベクトル表現。次元数はEmbeddingProviderに依存 */
  embedding: number[]
  metadata: MemoryMetadata
  createdAt: Date
  updatedAt: Date
}

export interface MemoryMetadata {
  /** どのセッションで生まれたか */
  sessionId: string
  /** プロジェクトのパス */
  projectPath?: string
  /** キーワードタグ */
  tags?: string[]
  /** 手動保存 or Hooks自動保存 */
  source: 'manual' | 'auto'
}

export interface SearchResult {
  memory: Memory
  /** RRF統合スコア（0〜1）。k=60, 時間減衰半減期30日 */
  score: number
  matchType: 'keyword' | 'vector' | 'hybrid'
}

/** 検索パラメータのデフォルト値 */
export const SEARCH_DEFAULTS = {
  /** RRF の k パラメータ */
  rrfK: 60,
  /** 時間減衰の半減期（日数） */
  decayHalfLifeDays: 30,
  /** 検索結果の上限 */
  maxResults: 20,
} as const

export interface StorageStats {
  totalMemories: number
  totalSessions: number
  oldestMemory: Date | null
  newestMemory: Date | null
  averageContentLength: number
}

export interface ListOptions {
  /** 取得件数。デフォルト: 20、最大: 100 */
  limit: number
  /** オフセット。デフォルト: 0 */
  offset: number
  source?: 'manual' | 'auto'
  sessionId?: string
  sortBy?: 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface ConversationLog {
  sessionId: string
  projectPath?: string
  messages: ConversationMessage[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface Chunk {
  content: string
  /** tags はチャンク生成後に自動抽出で付与される（TF-IDFベースのキーワード抽出） */
  metadata: MemoryMetadata
}
```

### インターフェース（ポート）

```typescript
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  getDimension(): number
}

export interface StorageRepository {
  save(memory: Memory): Promise<void>
  saveBatch(memories: Memory[]): Promise<void>
  findById(id: string): Promise<Memory | null>
  /** キーワード検索。pg_bigm bigram部分一致。複数語はAND結合 */
  searchByKeyword(query: string, limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  /** ベクトル検索。コサイン類似度 */
  searchByVector(embedding: number[], limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  list(options: ListOptions): Promise<Memory[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
  getStats(): Promise<StorageStats>
}

export interface SearchFilter {
  /** プロジェクトパスでスコープ */
  projectPath?: string
  /** ソースで絞り込み */
  source?: 'manual' | 'auto'
}

export interface ChunkingStrategy {
  chunk(conversation: ConversationLog): Chunk[]
}
```

### ユースケース

```typescript
class SaveMemoryUseCase {
  constructor(
    private storage: StorageRepository,
    private embedding: EmbeddingProvider,
    private chunking: ChunkingStrategy,
  ) {}
  // 手動保存: content → ベクトル化 → 保存
  // 自動保存: 会話ログ → Q&Aチャンク分割 → ベクトル化 → 一括保存
  // embedBatch で1件失敗した場合: 失敗分をスキップし、成功分のみ保存。失敗分はログ出力（pino warn）
}

class SearchMemoryUseCase {
  constructor(
    private storage: StorageRepository,
    private embedding: EmbeddingProvider,
  ) {}
  // 1. クエリをベクトル化
  // 2. pg_bigm bigram キーワード検索（PostgreSQL GIN）
  // 3. ベクトル検索（pgvector HNSW コサイン類似度）
  // 4. RRF（Reciprocal Rank Fusion, k=60）でスコア統合
  // 5. 時間減衰適用（半減期30日、古い記憶ほどスコア低下）
  // 6. SearchResult[] を返す
}

class DeleteMemoryUseCase { ... }
class ListMemoriesUseCase { ... }
class GetStatsUseCase { ... }
class ClearMemoryUseCase { ... }
```

### エラーハンドリング

```typescript
export class MemoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
  }
}
export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super(`Memory not found: ${id}`, 'MEMORY_NOT_FOUND')
  }
}
export class EmbeddingFailedError extends MemoryError {
  constructor(reason: string) {
    super(`Embedding failed: ${reason}`, 'EMBEDDING_FAILED')
  }
}
export class StorageConnectionError extends MemoryError {
  constructor(reason: string) {
    super(`Storage connection error: ${reason}`, 'STORAGE_CONNECTION_ERROR')
  }
}
```

---

## infrastructure パッケージ群

### embedding-onnx

```typescript
class OnnxEmbeddingProvider implements EmbeddingProvider {
  // デフォルト: multilingual-e5-small（384次元）
  // 設定でモデル名を変更可能（Ruri v3等）
  constructor(private config: { modelName: string }) {}

  // @huggingface/transformers でONNX推論
  // 初回はモデルをHugging Faceからダウンロード → ~/.cache/ にキャッシュ
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  getDimension(): number  // モデルに応じて返す（e5-small: 384）
}
```

### storage-postgres

**drizzle スキーマ定義 + zod バリデーション:**

```typescript
import { pgTable, text, uuid, timestamp, vector } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  // 次元数は環境変数 EMBEDDING_DIMENSION で設定可能（デフォルト: 384）
  embedding: vector('embedding', { dimensions: embeddingDimension }),
  sessionId: text('session_id'),
  projectPath: text('project_path'),
  tags: text('tags').array(),
  source: text('source').$type<'manual' | 'auto'>(),
  createdAt: timestamp('created_at').defaultNow(),
  // updatedAt は save 時にアプリケーション層で明示的にセットする
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const insertMemorySchema = createInsertSchema(memories, {
  content: (schema) => schema.min(1, '空文字不可'),
})
export const selectMemorySchema = createSelectSchema(memories)
```

**SQL インデックス:**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_bigm;

-- キーワード全文検索（日本語対応、pg_bigm bigram）
CREATE INDEX idx_memories_bigm ON memories
  USING gin(content gin_bigm_ops);

-- ベクトル検索（HNSW、空テーブルでも作成可能、チューニング不要）
CREATE INDEX idx_memories_vector ON memories
  USING hnsw (embedding vector_cosine_ops);
```

**注意:** Docker イメージは `pgvector/pgvector:pg16` に pg_bigm を追加でインストールする必要がある（カスタム Dockerfile）。

**DBマイグレーション:** drizzle-kit でマイグレーション管理

### hooks

```typescript
class SessionEndHandler {
  constructor(
    private chunking: ChunkingStrategy,
    private saveUseCase: SaveMemoryUseCase,
  ) {}
  // 1. JSONL会話ログを読み取り（~/.claude/projects/ 配下のセッションログ）
  //    形式: 1行1JSON { role: "user"|"assistant", content: string, timestamp: string }
  // 2. Q&Aチャンクに分割
  // 3. SaveMemoryUseCaseで保存
  async handle(conversationLogPath: string): Promise<void>
}

class QAChunkingStrategy implements ChunkingStrategy {
  // user発言 → assistant応答 のペアで1チャンク
  chunk(conversation: ConversationLog): Chunk[]
}
```

---

## MCP Server

**トランスポート:** stdio（Claude Code 標準）

### ツール定義

```typescript
const server = new McpServer({ name: 'claude-memory' })

// DI: 環境変数から設定を読んで組み立て
const embedding = new OnnxEmbeddingProvider({ modelName: config.modelName })
const storage = new PostgresStorageRepository({ connectionString: config.dbUrl })
const chunking = new QAChunkingStrategy()

server.tool('memory_save',   ...)  // → SaveMemoryUseCase
server.tool('memory_search', ...)  // → SearchMemoryUseCase
server.tool('memory_delete', ...)  // → DeleteMemoryUseCase
server.tool('memory_list',   ...)  // → ListMemoriesUseCase
server.tool('memory_stats',  ...)  // → GetStatsUseCase
server.tool('memory_clear',  ...)  // → ClearMemoryUseCase
```

---

## Docker 構成

### docker-compose.yml（本番）

```yaml
services:
  db:
    build:
      context: .
      dockerfile: Dockerfile.db
    # カスタムイメージ: pgvector + pg_bigm
    environment:
      POSTGRES_DB: claude_memory
      POSTGRES_USER: memory
      POSTGRES_PASSWORD: memory  # ローカル開発専用。本番では .env で上書き
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U memory -d claude_memory"]
      interval: 5s
      timeout: 5s
      retries: 5

  mcp-server:
    build: .
    depends_on:
      db:
        condition: service_healthy
    env_file: .env
    environment:
      DATABASE_URL: postgresql://memory:memory@db:5432/claude_memory
      EMBEDDING_MODEL: intfloat/multilingual-e5-small
      EMBEDDING_DIMENSION: 384

volumes:
  pgdata:
```

### docker-compose.test.yml（テスト）

```yaml
services:
  db-test:
    build:
      context: .
      dockerfile: Dockerfile.db
    # 本番と同じカスタムイメージ（pgvector + pg_bigm）を使用
    environment:
      POSTGRES_DB: claude_memory_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d claude_memory_test"]
      interval: 5s
      timeout: 5s
      retries: 5
```

### セットアップ手順

```bash
git clone <repo>
cd claude-memory
docker compose up -d
```

Claude Code settings.json:

```json
{
  "mcpServers": {
    "claude-memory": {
      "command": "docker",
      "args": ["exec", "claude-memory-mcp-server-1", "node", "dist/index.js"]
    }
  },
  "hooks": {
    "PostSessionEnd": [{
      "command": "docker exec claude-memory-mcp-server-1 node dist/hooks/session-end.js"
    }]
  }
}
```

---

## データフロー

### 保存フロー（手動 / セッション終了時）

```
Claude Code → MCP Server (memory_save) → ChunkingStrategy (Q&A分割)
  → EmbeddingProvider (ベクトル化) → StorageRepository (PostgreSQL保存)
```

### 検索フロー（ハイブリッド検索）

```
Claude Code → MCP Server (memory_search) → SearchMemoryUseCase
  ├→ pg_bigm bigram キーワード検索 (PostgreSQL GIN)
  └→ EmbeddingProvider (クエリベクトル化) → ベクトル検索 (pgvector HNSW コサイン類似度)
  → RRF (Reciprocal Rank Fusion) スコア統合 + 時間減衰
  → SearchResult[] ランキング済み
```

### Hooks 自動保存フロー

```
Claude Code セッション終了 → Hooks発火 (settings.json)
  → @claude-memory/hooks 会話ログ取得
  → Q&A チャンク分割 + メタデータ付与
  → SaveMemoryUseCase (保存フローへ)
```

---

## 技術スタック

| カテゴリ | ツール |
|---------|--------|
| 言語 | TypeScript (strict mode) |
| ランタイム | Node.js 22.x |
| monorepo | pnpm workspaces |
| Formatter | Biome |
| Linter | OXLint（全ルール有効ベース） |
| 未使用コード | knip |
| 依存方向監視 | dependency-cruiser → SVG自動生成 |
| テスト | Vitest |
| Git hooks | lefthook |
| コミット | Conventional Commits + commitlint |
| バージョン | semantic-release |
| DB | PostgreSQL 16 + pgvector + pg_bigm |
| ORM / マイグレーション | drizzle-orm + drizzle-kit + drizzle-zod |
| 埋め込み | @huggingface/transformers (ONNX, multilingual-e5-small) |
| MCP | @modelcontextprotocol/sdk |
| コンテナ | Docker Compose |
| ロギング | pino + pino-pretty |
| 型ドキュメント | JSDoc + typedoc |
| 図 | draw.io → CI で PNG 自動生成 |
| 依存更新 | Renovate (stabilityDays: 7) |

---

## pnpm 設定

### .npmrc

```ini
# バージョン管理
save-exact=true
# 範囲内で最も低いバージョンを解決し再現性を担保する（ADR参照）
resolution-mode=lowest
use-node-version=22.14.0
engine-strict=true

# ホイスティング
hoist=false

# peer dependency
strict-peer-dependencies=true

# lockfile
frozen-lockfile=true
prefer-frozen-lockfile=true

# キャッシュ
side-effects-cache=true
prefer-offline=true
```

### pnpm-workspace.yaml

```yaml
packages:
  - packages/*

catalog:
  typescript: 5.7.3
  vitest: 3.1.1
  "@huggingface/transformers": 3.4.1
  "@modelcontextprotocol/sdk": 1.12.1
  pg: 8.14.1
  drizzle-orm: 0.39.3
  pino: 9.6.0
```

### package.json

```json
{
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=10.0.0"
  },
  "packageManager": "pnpm@10.8.1"
}
```

---

## テスト戦略

| レベル | 対象 | 実行環境 | 実行タイミング |
|--------|------|---------|---------------|
| 単体 | core（RRF、時間減衰等） | Node.js のみ | pre-commit, CI |
| 結合 | 各パッケージ | docker-compose.test.yml | CI, 手動 |
| E2E | 全パッケージ一気通貫（MCPプロトコル経由） | docker-compose.test.yml | CI, 手動 |

- カバレッジ: パッケージごとに単体+結合で **最低75%、目標80%**
- E2E はカバレッジ対象外

---

## コード品質ツール実行タイミング

| ツール | pre-commit | pre-push | CI |
|--------|-----------|----------|-----|
| Biome (format) | o | | o |
| OXLint (lint) | o | | o |
| knip (変更分: lint-staged経由で変更ファイルのexportsのみ) | o | | |
| knip (全体) | | o | o |
| dependency-cruiser | o | | o (+ SVG生成) |
| TypeScript | | | o |
| commitlint | commit-msg | | |
| Vitest (単体) | | | o |
| Vitest (結合 + E2E) | | | o |

---

## GitHub 運用

### ブランチルール

```
feat/#12-add-memory-search
fix/#15-vector-index-error
chore/#20-update-deps
```

### コミットルール（Conventional Commits）

```
feat(core): add SearchMemoryUseCase
fix(storage-postgres): handle connection timeout
docs(adr): add ADR-001 for embedding model selection
chore(hooks): update dependencies
```

### Issue 階層

```
Epic: 長期記憶システムの構築
  ├── Task: coreパッケージの実装              ← 1 PR
  ├── Story: memory_searchの検索体験         ← 1 PR
  ├── Bug: ベクトル検索の精度が低い            ← 1 PR
  └── Task: storage-postgresの実装            ← 大きい場合 ↓
       ├── Subtask: テーブル設計 & マイグレーション   ← 1 PR
       └── Subtask: StorageRepository実装           ← 1 PR
```

- Epic → Task/Story/Bug は sub-issue で表現
- Task 等が 2PR 以上になりそうな場合 Subtask を作成
- PR と Issue は 1:1
- PR に Issue を紐付けて close する

### GitHub Projects

| カラム | 説明 |
|--------|------|
| Backlog | 未着手 |
| Ready | 着手可能（依存解決済み） |
| In Progress | AI または人間が作業中 |
| Review | PR レビュー待ち |
| QA | 人間による動作確認 |
| Done | 完了 |

### Issue テンプレート

#### Epic (.github/ISSUE_TEMPLATE/epic.yml)

```yaml
name: "Epic"
description: "大きな機能単位の目標"
labels: ["epic"]
body:
  - type: textarea
    id: goal
    attributes:
      label: "ゴール"
      description: "この Epic で達成したいこと"
    validations:
      required: true
  - type: textarea
    id: success-criteria
    attributes:
      label: "完了条件"
      description: "何をもって Done とするか"
    validations:
      required: true
  - type: textarea
    id: child-issues
    attributes:
      label: "子Issue一覧"
      description: "Task / Story / Bug への分解（後から更新OK）"
      value: |
        - [ ] #
```

#### Task (.github/ISSUE_TEMPLATE/task.yml)

```yaml
name: "Task"
description: "技術的な実装作業"
labels: ["task"]
body:
  - type: input
    id: parent-epic
    attributes:
      label: "親Epic"
      description: "関連するEpicの番号（例: #1）"
  - type: textarea
    id: what
    attributes:
      label: "やること"
      description: "具体的な作業内容"
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: "受け入れ条件"
      description: "PR時に確認するチェックリスト"
      value: |
        - [ ] テストが通る
        - [ ] 型エラーがない
        - [ ] knipで未使用コードがない
    validations:
      required: true
  - type: textarea
    id: technical-notes
    attributes:
      label: "技術メモ"
      description: "実装方針、参考情報（任意）"
```

#### Bug (.github/ISSUE_TEMPLATE/bug.yml)

```yaml
name: "Bug"
description: "不具合報告"
labels: ["bug"]
body:
  - type: textarea
    id: what-happened
    attributes:
      label: "何が起きたか"
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: "期待する動作"
    validations:
      required: true
  - type: textarea
    id: reproduce
    attributes:
      label: "再現手順"
      value: |
        1.
        2.
        3.
    validations:
      required: true
  - type: input
    id: environment
    attributes:
      label: "環境"
      description: "OS, Node.js version, Docker version 等"
```

#### Story (.github/ISSUE_TEMPLATE/story.yml)

```yaml
name: "Story"
description: "ユーザー視点の機能要求"
labels: ["story"]
body:
  - type: input
    id: parent-epic
    attributes:
      label: "親Epic"
  - type: textarea
    id: user-story
    attributes:
      label: "ユーザーストーリー"
      description: "〜として、〜したい。なぜなら〜"
      value: |
        **〜として**、
        **〜したい。**
        **なぜなら**〜
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: "受け入れ条件"
      value: |
        - [ ]
    validations:
      required: true
```

#### Subtask (.github/ISSUE_TEMPLATE/subtask.yml)

```yaml
name: "Subtask"
description: "Taskをさらに分解した作業単位"
labels: ["subtask"]
body:
  - type: input
    id: parent-task
    attributes:
      label: "親Task"
      description: "関連するTaskの番号（例: #5）"
    validations:
      required: true
  - type: textarea
    id: what
    attributes:
      label: "やること"
    validations:
      required: true
  - type: textarea
    id: done
    attributes:
      label: "完了条件"
      value: |
        - [ ]
```

---

## CI パイプライン

### PR 時

```yaml
jobs:
  lint:
    - Biome (format check)
    - OXLint (lint)
    - knip (未使用コード)
    - dependency-cruiser (依存方向検証 + SVG生成)
    - TypeScript (型検査)
    - commitlint (コミットメッセージ検証)

  test:
    services:
      - カスタムDB (Dockerfile.db: pgvector + pg_bigm, port 5433)
    steps:
      - Vitest (単体 + 結合 + E2E)
      - カバレッジレポート (パッケージごと75%以上)

  docs:
    - draw.io → PNG 変換 (rlespinasse/drawio-export-action)
    - typedoc → API 仕様書生成
    - dependency-cruiser → 依存グラフSVG生成
```

### main マージ時

```yaml
jobs:
  release:
    - semantic-release (バージョン bump + tag + GitHub Release + CHANGELOG)
```

---

## ドキュメント・管理体系

| 場所 | 役割 | 性質 |
|------|------|------|
| Skills（別リポジトリ: dev-skills） | ルール + ワークフロー（SSoT） | 汎用、再利用可能 |
| .project-config.yml | プロジェクト固有の設定値 | プロジェクト固有 |
| CLAUDE.md | AI索引 + スキルへのポインタ | プロジェクト固有 |
| docs/specs/ | 設計段階の仕様書（実装後 JSDoc に移行） | プロジェクト固有 |
| docs/adr/ | ADR（root単位 + パッケージ単位） | プロジェクト固有 |
| docs/diagrams/ | draw.io 図（CI で PNG 自動生成） | プロジェクト固有 |
| core の型 + JSDoc | 実装後の仕様 SSoT | コード内 |
| typedoc 出力 | API 仕様書（自動生成） | 自動生成 |
| dependency-cruiser SVG | 依存グラフ（自動生成） | 自動生成 |

### SDD フロー

1. 設計段階: Markdown 仕様書 (`docs/specs/`)
2. 実装: core の型 + JSDoc に移行
3. 以降のメンテ: JSDoc だけ更新、Markdown 仕様書はアーカイブ

### スキル構成（別リポジトリ: dev-skills）

```
skills/
  conventional-commits/     # コミット・ブランチルール
  github-flow/              # Issue階層・PR・Projects運用
  sdd/                      # 仕様駆動開発フロー
  adr/                      # ADR作成・管理
  code-quality/             # OXLint/Biome/knip/dependency-cruiser
  diagram-management/       # draw.io・依存グラフCI自動生成
  project-bootstrap/        # 統括スキル（↑を束ねて新プロジェクト初期化）
```

---

## ハーネス構成

```
人間 → ガード (CLAUDE.md + Skills) → AI
  → ツール使用 (MCP: claude-memory)
  → エージェント間通信 (worktree 並行開発)
  → 承認ゲート (PR Review + QA)
  → 記憶 (PostgreSQL + pgvector)
  → 次セッション / 人間へ返却
セッション監視: Hooks (セッション終了時自動保存)
```

---

## シークレット管理

- docker-compose.yml にデフォルト値を直接記載
- カスタムしたい場合のみ `.env` で上書き（`env_file: .env`）
- `.env` は `.gitignore` で除外

---

## Renovate 設定

```json5
{
  "extends": ["config:base"],
  "stabilityDays": 7,
  "prCreation": "not-pending",
  "packageRules": [
    {
      "matchUpdateTypes": ["major"],
      "automerge": false
    },
    {
      "matchUpdateTypes": ["minor"],
      "automerge": false
    },
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "stabilityDays": 3
    }
  ]
}
```

---

## 将来の拡張（対象外・Issue化）

- [ ] トピック分割チャンキング（`ChunkingStrategy` の新実装追加）
- [ ] Ruri v3 ONNX モデル対応（`EmbeddingProvider` の新実装追加）
- [ ] SQLite ストレージ実装（`StorageRepository` の新実装追加）
- [ ] pgroonga による日本語全文検索のさらなる精度向上
