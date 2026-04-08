# エージェント向けローカルコンテキスト整備 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** パッケージ別 CLAUDE.md、エージェント定義、セルフレビュー/失敗記録スキルを追加し、AI エージェントが各パッケージで自律的に作業できるローカルコンテキストを整備する。

**Architecture:** ドキュメント・設定ファイルのみの追加。コード変更なし。各タスクは独立しており並列実行可能。

**Tech Stack:** Markdown, Claude Code Skills (SKILL.md frontmatter), Claude Code Agents (.claude/agents/)

---

## Task 1: packages/core/CLAUDE.md

**Files:**
- Create: `packages/core/CLAUDE.md`

- [ ] **Step 1: CLAUDE.md を作成**

```markdown
# @claude-memory/core

## 責務

ドメイン層。ビジネスロジックとインターフェース定義の中心。外部依存ゼロ。

## 依存方向

- 依存先: なし（依存ゼロが必須条件）
- 依存元: storage-postgres, embedding-onnx, hooks, mcp-server

core が外部パッケージを import することは禁止。dependency-cruiser で自動検証される。

## 主要インターフェース

| インターフェース | ファイル | 役割 |
|----------------|---------|------|
| `StorageRepository` | `src/interfaces/storage-repository.ts` | 永続化レイヤー抽象 |
| `EmbeddingProvider` | `src/interfaces/embedding-provider.ts` | ベクトル生成抽象 |
| `ChunkingStrategy` | `src/interfaces/chunking-strategy.ts` | 会話分割抽象 |

## 主要エンティティ

| エンティティ | ファイル |
|-------------|---------|
| `Memory`, `MemoryMetadata`, `ListOptions`, `StorageStats` | `src/entities/memory.ts` |
| `SearchResult`, `SearchFilter` | `src/entities/search-result.ts` |
| `Chunk` | `src/entities/chunk.ts` |
| `ConversationLog`, `ConversationMessage` | `src/entities/conversation.ts` |

## ユースケース

`src/use-cases/` 配下に10個: Save, Search, Update, Delete, List, Export, Import, Cleanup, GetStats, Clear

## 定数

`src/constants.ts` に検索・重複排除・容量管理のデフォルト値を集約。

## コマンド

- `pnpm --filter @claude-memory/core test` — ユニットテスト
- `pnpm --filter @claude-memory/core build` — ビルド

## 制約

- 外部パッケージ（npm）への依存追加は原則禁止
- 型定義変更時は JSDoc も同時に更新する
- インターフェース変更は全実装パッケージに影響するため慎重に
```

- [ ] **Step 2: コミット**

```bash
git add packages/core/CLAUDE.md
git commit -m "docs(core): パッケージ別 CLAUDE.md を追加 (#132)"
```

---

## Task 2: packages/storage-postgres/CLAUDE.md

**Files:**
- Create: `packages/storage-postgres/CLAUDE.md`

- [ ] **Step 1: CLAUDE.md を作成**

```markdown
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

## 制約

- bulk insert は 500 件ごとにチャンク分割（PostgreSQL パラメータ上限対策）
- embedding の SQL キャストは `::vector` が必要
- SQL インジェクション対策: Drizzle の `sql` テンプレートリテラルを使用し、文字列結合は禁止
- コネクションプール最大数はデフォルト 10（`DB_POOL_SIZE` で変更可能）
```

- [ ] **Step 2: コミット**

```bash
git add packages/storage-postgres/CLAUDE.md
git commit -m "docs(storage-postgres): パッケージ別 CLAUDE.md を追加 (#132)"
```

---

## Task 3: packages/embedding-onnx/CLAUDE.md

**Files:**
- Create: `packages/embedding-onnx/CLAUDE.md`

- [ ] **Step 1: CLAUDE.md を作成**

```markdown
# @claude-memory/embedding-onnx

## 責務

インフラ層。core の `EmbeddingProvider` インターフェースを ONNX Runtime で実装する。

## 依存方向

- 依存先: `@claude-memory/core`（インターフェースと型のみ）
- 依存元: `mcp-server`

## 主要クラス

| クラス | ファイル | 役割 |
|--------|---------|------|
| `OnnxEmbeddingProvider` | `src/onnx-embedding-provider.ts` | EmbeddingProvider 実装 |

## 技術スタック

- **@huggingface/transformers** — ONNX モデルのロードと推論
- デフォルトモデル: `intfloat/multilingual-e5-small`（384 次元）

## コマンド

- `pnpm --filter @claude-memory/embedding-onnx test` — テスト
- `pnpm --filter @claude-memory/embedding-onnx build` — ビルド

## 制約

- モデルは遅延初期化（初回 embed 時にダウンロード、`~/.cache/` にキャッシュ）
- 入力上限: 約 512 トークン（日本語で約 1000 文字）
- embedBatch は `Promise.all` で並列処理
```

- [ ] **Step 2: コミット**

```bash
git add packages/embedding-onnx/CLAUDE.md
git commit -m "docs(embedding-onnx): パッケージ別 CLAUDE.md を追加 (#132)"
```

---

## Task 4: packages/mcp-server/CLAUDE.md

**Files:**
- Create: `packages/mcp-server/CLAUDE.md`

- [ ] **Step 1: CLAUDE.md を作成**

```markdown
# @claude-memory/mcp-server

## 責務

インターフェース層。MCP プロトコルで 10 種のメモリ操作ツールを公開する。DI コンテナで全パッケージを組み立てる統合ハブ。

## 依存方向

- 依存先: `core`, `storage-postgres`, `embedding-onnx`, `hooks`
- 依存元: なし（エントリポイント）

## 構成

| ファイル | 役割 |
|---------|------|
| `src/index.ts` | エントリポイント（startServer） |
| `src/server.ts` | MCP サーバー定義、ツール登録 |
| `src/container.ts` | DI コンテナ（createContainer） |
| `src/config.ts` | 環境変数からの設定読み込み |
| `src/tools/*.ts` | 各ツールのハンドラ（10 ファイル） |
| `src/session-start.ts` | セッション開始時のコンテキスト注入 |

## MCP ツール一覧

memory-save, memory-search, memory-list, memory-update, memory-delete, memory-export, memory-import, memory-cleanup, memory-clear, memory-stats

詳細仕様: [docs/generated/mcp-tools.md](../../docs/generated/mcp-tools.md)（自動生成）

## コマンド

- `pnpm --filter @claude-memory/mcp-server test` — テスト
- `pnpm --filter @claude-memory/mcp-server build` — ビルド
- `pnpm --filter @claude-memory/mcp-server start` — MCP サーバー起動
- `pnpm --filter @claude-memory/mcp-server docs:generate` — ツールドキュメント自動生成

## 制約

- トランスポートは stdio のみ（HTTP/WebSocket 非対応）
- Pino ロガーで構造化ログ出力
- ツール追加時は `src/tools/tool-metadata.ts` にメタデータを定義し、`docs:generate` でドキュメントを再生成する
```

- [ ] **Step 2: コミット**

```bash
git add packages/mcp-server/CLAUDE.md
git commit -m "docs(mcp-server): パッケージ別 CLAUDE.md を追加 (#132)"
```

---

## Task 5: packages/hooks/CLAUDE.md

**Files:**
- Create: `packages/hooks/CLAUDE.md`

- [ ] **Step 1: CLAUDE.md を作成**

```markdown
# @claude-memory/hooks

## 責務

インターフェース層。Claude Code のセッションフック（開始・終了）を処理し、会話を記憶として保存する。QA チャンキング戦略も提供。

## 依存方向

- 依存先: `@claude-memory/core`（インターフェースと型のみ）
- 依存元: `mcp-server`

## 主要クラス

| クラス | ファイル | 役割 |
|--------|---------|------|
| `SessionStartHandler` | `src/session-start-handler.ts` | セッション開始時に関連記憶を検索・注入 |
| `SessionEndHandler` | `src/session-end-handler.ts` | セッション終了時に会話を記憶として保存 |
| `QAChunkingStrategy` | `src/qa-chunking-strategy.ts` | 会話を Q&A ペアに分割（ChunkingStrategy 実装） |

## コマンド

- `pnpm --filter @claude-memory/hooks test` — テスト
- `pnpm --filter @claude-memory/hooks build` — ビルド

## 制約

- QA チャンク最大サイズ: 1000 文字（日本語の文境界で分割）
- 重要度フィルタリングがデフォルト有効（決定、選定、バグ、エラー等のキーワード）
- JSONL パースはエラー耐性あり（不正行はスキップ）
```

- [ ] **Step 2: コミット**

```bash
git add packages/hooks/CLAUDE.md
git commit -m "docs(hooks): パッケージ別 CLAUDE.md を追加 (#132)"
```

---

## Task 6: エージェント定義 4 ファイル

**Files:**
- Create: `.claude/agents/core-developer.md`
- Create: `.claude/agents/storage-developer.md`
- Create: `.claude/agents/mcp-developer.md`
- Create: `.claude/agents/hooks-developer.md`

- [ ] **Step 1: core-developer.md を作成**

```markdown
---
name: core-developer
description: core パッケージ専任開発エージェント
isolation: worktree
---

# Core Developer

## スコープ

`packages/core/` のみを対象に作業する。

## 責務

- ビジネスロジック（ユースケース）の実装・修正
- エンティティ・インターフェースの定義
- ユニットテストの作成・更新

## 依存方向ルール

- **外部パッケージの import は禁止**（storage-postgres, embedding-onnx, hooks, mcp-server を import してはならない）
- npm パッケージへの依存追加も原則禁止
- インターフェース変更は全実装パッケージに影響するため、変更内容を明確に報告する

## 作業手順

1. `packages/core/CLAUDE.md` を読んでコンテキストを把握する
2. TDD で実装する（RED → GREEN → REFACTOR）
3. セルフレビュー: `pnpm --filter @claude-memory/core test` で全テスト合格を確認
4. 型定義変更時は JSDoc も同時に更新する
5. Conventional Commits でコミット（scope: `core`）
```

- [ ] **Step 2: storage-developer.md を作成**

```markdown
---
name: storage-developer
description: storage-postgres パッケージ専任開発エージェント
isolation: worktree
---

# Storage Developer

## スコープ

`packages/storage-postgres/` のみを対象に作業する。

## 責務

- `PostgresStorageRepository` の実装・修正
- Drizzle ORM スキーマ変更・マイグレーション生成
- 統合テストの作成・更新

## 依存方向ルール

- **`@claude-memory/core` のインターフェースと型のみ import 可能**
- embedding-onnx, hooks, mcp-server を import してはならない

## 作業手順

1. `packages/storage-postgres/CLAUDE.md` を読んでコンテキストを把握する
2. テスト用 DB が起動していることを確認: `docker compose -f docker-compose.test.yml ps`
3. TDD で実装する
4. セルフレビュー: `pnpm --filter @claude-memory/storage-postgres test` で全テスト合格を確認
5. スキーマ変更時は `db:generate` でマイグレーション SQL を生成する
6. SQL インジェクション対策: 文字列結合ではなく Drizzle の `sql` テンプレートリテラルを使用
7. Conventional Commits でコミット（scope: `storage-postgres`）
```

- [ ] **Step 3: mcp-developer.md を作成**

```markdown
---
name: mcp-developer
description: mcp-server パッケージ専任開発エージェント
isolation: worktree
---

# MCP Developer

## スコープ

`packages/mcp-server/` のみを対象に作業する。

## 責務

- MCP ツールハンドラの実装・修正
- DI コンテナ構成の変更
- ツールドキュメントの自動生成

## 依存方向ルール

- **全内部パッケージを import 可能**（統合ハブのため）
- ただしビジネスロジックは core のユースケースに委譲し、mcp-server にロジックを書かない

## 作業手順

1. `packages/mcp-server/CLAUDE.md` を読んでコンテキストを把握する
2. TDD で実装する
3. セルフレビュー: `pnpm --filter @claude-memory/mcp-server test` で全テスト合格を確認
4. ツール追加・変更時は `pnpm --filter @claude-memory/mcp-server docs:generate` でドキュメントを再生成する
5. Conventional Commits でコミット（scope: `mcp-server`）
```

- [ ] **Step 4: hooks-developer.md を作成**

```markdown
---
name: hooks-developer
description: hooks + embedding-onnx パッケージ専任開発エージェント
isolation: worktree
---

# Hooks Developer

## スコープ

`packages/hooks/` と `packages/embedding-onnx/` を対象に作業する。

## 責務

- セッションフック（開始・終了）ハンドラの実装・修正
- QA チャンキング戦略の改善
- ONNX embedding プロバイダの実装・修正

## 依存方向ルール

- **`@claude-memory/core` のインターフェースと型のみ import 可能**
- storage-postgres, mcp-server を import してはならない
- hooks と embedding-onnx の間に相互依存を作ってはならない

## 作業手順

1. 対象パッケージの `CLAUDE.md` を読んでコンテキストを把握する
2. TDD で実装する
3. セルフレビュー:
   - `pnpm --filter @claude-memory/hooks test`
   - `pnpm --filter @claude-memory/embedding-onnx test`
4. Conventional Commits でコミット（scope: `hooks` または `embedding-onnx`）
```

- [ ] **Step 5: コミット**

```bash
git add .claude/agents/
git commit -m "chore: パッケージ別エージェント定義を追加 (#130)"
```

---

## Task 7: セルフレビュースキル

**Files:**
- Create: `.claude/skills/self-review/SKILL.md`

- [ ] **Step 1: SKILL.md を作成**

```markdown
---
name: self-review
description: 実装後の検証サイクル（lint/test/dep-check/knip）
---

# セルフレビュー

実装が完了したら、以下の検証サイクルを実行する。全パスするまでコミットしない。

## 検証サイクル

1. **lint**: `pnpm lint`
   - OXLint + Biome のエラーを修正
   - Biome の auto-fix が TypeScript の型エラーを引き起こす場合があるため、修正後に型チェックも確認

2. **test**: `pnpm test` または対象パッケージのみ `pnpm --filter <pkg> test`
   - 失敗したテストは修正してから次へ

3. **dep-check**: `pnpm dep-check`
   - 依存方向違反があれば import を修正

4. **knip**: `pnpm knip`
   - 未使用の export, ファイル, 依存があれば削除

## 修正ループ

```
実装 → lint → 失敗? → 修正 → lint（再実行）
                ↓ 成功
            test → 失敗? → 修正 → test（再実行）
                ↓ 成功
            dep-check → 失敗? → 修正 → dep-check（再実行）
                ↓ 成功
            knip → 失敗? → 修正 → knip（再実行）
                ↓ 成功
            コミット可能
```

## 注意事項

- パッケージ単体で作業している場合も、最終確認はルートの `pnpm test` で全体テストを実行する
- pre-commit フックで lint-staged + knip + dep-check が自動実行されるが、コミット前に手動で確認しておくとフック失敗による手戻りを防げる
```

- [ ] **Step 2: コミット**

```bash
git add .claude/skills/self-review/
git commit -m "chore: セルフレビュースキルを追加 (#131)"
```

---

## Task 8: 失敗記録スキル + ADR

**Files:**
- Create: `.claude/skills/failure-record/SKILL.md`
- Create: `docs/adr/0007-agent-failure-rules.md`

- [ ] **Step 1: SKILL.md を作成**

```markdown
---
name: failure-record
description: エージェントの失敗記録と再発防止ルール管理
---

# 失敗記録

エージェントのミスが発生した場合、以下のフローで記録と再発防止を行う。

## 記録フロー

1. **失敗の特定**: 何が起きたか（エラーメッセージ、期待と実際の差異）
2. **原因分析**: なぜ起きたか（ルール不足、コンテキスト不足、判断ミス）
3. **対策決定**: 再発防止のルールまたはチェック項目
4. **ADR に追記**: `docs/adr/0007-agent-failure-rules.md` にエントリを追加
5. **ルール反映**: 該当するスキル、CLAUDE.md、またはエージェント定義にルールを追加

## ADR エントリフォーマット

```markdown
### FAIL-NNN: タイトル (YYYY-MM-DD)

- **事象**: 何が起きたか
- **原因**: なぜ起きたか
- **対策**: 追加したルール/変更
- **反映先**: どのファイルに反映したか
```

## いつ使うか

- lint/test/dep-check で予期しない失敗が発生したとき
- レビューで指摘された設計・実装上の問題
- 同じ種類のミスが2回以上発生したとき
```

- [ ] **Step 2: ADR 0007 を作成**

```markdown
# ADR-0007: エージェント失敗ルールの蓄積

## ステータス

Accepted

## コンテキスト

AI エージェントが繰り返すミスを防ぐため、失敗事例と追加したルールを一元管理する場所が必要。個別の CLAUDE.md やスキルにルールは反映するが、「なぜそのルールが存在するか」の履歴をここに残す。

## 決定

失敗→ルール追加の履歴を本 ADR に蓄積する。各エントリは事象・原因・対策・反映先を記録する。

## 失敗履歴

### FAIL-001: memory_search 未実行でコンテキスト不足 (2026-04-05)

- **事象**: 既存の設計判断を知らずに矛盾する実装を行った
- **原因**: 作業開始前に memory_search でプロジェクトの記憶を検索しなかった
- **対策**: memory-usage スキルに「作業開始前に関連記憶を検索する」ステップを明記
- **反映先**: `.claude/skills/memory-usage/SKILL.md`

### FAIL-002: commitlint subject-case 違反 (2026-04-05)

- **事象**: コミットメッセージの description を大文字始まりにして commitlint が失敗
- **原因**: Conventional Commits の subject-case ルール（小文字）を把握していなかった
- **対策**: conventional-commits スキルに「小文字、ピリオドなし」を明記
- **反映先**: `.claude/skills/conventional-commits/SKILL.md`

### FAIL-003: biome auto-fix による TS 型エラー (2026-04-06)

- **事象**: Biome の auto-fix が型アサーションを削除し、TypeScript のコンパイルエラーが発生
- **原因**: lint 修正後に型チェックを再実行しなかった
- **対策**: self-review スキルに「Biome auto-fix 後は型チェックも確認」を追記
- **反映先**: `.claude/skills/self-review/SKILL.md`
```

- [ ] **Step 3: コミット**

```bash
git add .claude/skills/failure-record/ docs/adr/0007-agent-failure-rules.md
git commit -m "chore: 失敗記録スキルと ADR-0007 を追加 (#131)"
```

---

## Task 9: ルート CLAUDE.md 更新

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: スキル一覧に 2 行追加**

`## Skills` セクションの末尾に追加:

```markdown
- self-review → 実装後の検証サイクル（lint/test/dep-check/knip）
- failure-record → エージェントの失敗記録と再発防止ルール管理
```

- [ ] **Step 2: コミット**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md にスキル2件を追加 (#131)"
```
