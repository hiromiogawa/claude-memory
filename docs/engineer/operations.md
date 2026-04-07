# 運用ルール

## 開発環境構築

### 前提条件

- Node.js 22+
- pnpm 10.8+
- Docker / Docker Compose

### セットアップ手順

```bash
# 1. リポジトリクローン
git clone https://github.com/hiromiogawa/claude-memory.git
cd claude-memory

# 2. 依存インストール
pnpm install

# 3. テスト用DBを起動（ポート5434）
docker compose -f docker-compose.test.yml up -d

# 4. ビルド確認
pnpm build

# 5. テスト実行
pnpm test
```

### ディレクトリ構成

```
claude-memory/
├── packages/
│   ├── core/              # ドメイン層
│   ├── embedding-onnx/    # 埋め込み実装
│   ├── storage-postgres/  # DB実装
│   ├── mcp-server/        # MCPサーバー
│   └── hooks/             # Claude Codeフック
├── docs/
│   ├── images/            # アーキテクチャ図
│   ├── engineer/          # 開発者ドキュメント
│   ├── specs/             # 設計仕様書
│   └── plans/             # 実装計画
├── .github/workflows/     # CI設定
├── docker-compose.yml     # 本番環境
├── docker-compose.test.yml # テスト環境
├── Dockerfile             # MCPサーバーイメージ
└── Dockerfile.db          # PostgreSQLイメージ（pgvector + pg_bigm）
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `pnpm build` | 全パッケージをビルド |
| `pnpm test` | 全テスト実行 |
| `pnpm lint` | OXLint（jsdocプラグイン + no-magic-numbers）+ Biome |
| `pnpm knip` | 未使用コード・依存の検出 |
| `pnpm dep-check` | パッケージ間の依存方向検証（dependency-cruiser） |
| `pnpm format` | Biomeで自動フォーマット |

## コミット規約

[Conventional Commits](https://www.conventionalcommits.org/) に従う。commitlintで自動検証。

### スコープ

| スコープ | パッケージ |
|---------|-----------|
| `core` | @claude-memory/core |
| `embedding-onnx` | @claude-memory/embedding-onnx |
| `storage-postgres` | @claude-memory/storage-postgres |
| `mcp-server` | @claude-memory/mcp-server |
| `hooks` | @claude-memory/hooks |
| `ci` | CI/CD設定 |
| （スコープなし） | リポジトリ全体に関わる変更 |

### 例

```
feat(core): add UpdateMemoryUseCase
fix(storage-postgres): escape LIKE special chars
perf(embedding-onnx): parallelize embedBatch
refactor(hooks): extract magic strings to constants
docs: add comprehensive README
chore: migrate from lefthook to husky
```

## Gitフック

husky + lint-staged で管理。

| フック | 実行内容 | 目的 |
|--------|---------|------|
| `pre-commit` | lint-staged（biome --write + oxlint）, knip, dep-check | コード品質の維持 |
| `commit-msg` | commitlint | コミットメッセージの規約準拠 |
| `pre-push` | knip | 未使用コードの検出 |

### lint-staged設定

```json
{
  "*.{ts,tsx,js}": ["oxlint -c .oxlintrc.json"],
  "*.{ts,tsx,js,json}": ["biome check --write"]
}
```

biomeの `--write` により自動修正された結果は自動的に再ステージされる。

## CI（GitHub Actions）

`.github/workflows/ci.yml` でPR時に実行。

### ジョブ構成

| ジョブ | 内容 |
|--------|------|
| `lint` | pnpm install → lint → knip → dep-check → build |
| `test` | docker compose でテストDB起動 → スキーマ作成 → pnpm test |

### テストDB

CIではカスタムDockerfile（`Dockerfile.db`）でpgvector + pg_bigmを含むPostgreSQLイメージをビルドする。

スキーマ適用の流れ：
1. `psql` でExtension作成（`vector`, `pg_bigm`）
2. drizzle-kitで生成済みのマイグレーションSQL（`packages/storage-postgres/drizzle/`）を `psql -f` で実行

drizzle-kitの `push` コマンドはhoist=false環境で `drizzle-orm` を解決できないため、事前にSQLを生成してコミットする方式を採用している。

### スキーマ変更時のフロー

1. `packages/storage-postgres/src/schema.ts` を変更
2. `cd packages/storage-postgres && pnpm db:generate` で新しいマイグレーションSQLが生成される
3. 生成されたSQLファイルをコミット
4. CIで自動適用される

### Branch Protection

Terraform（`infra/github/`）で管理。masterブランチに対して：
- 直接pushの禁止
- `lint` と `test` のCIパス必須
- force push と branch 削除の禁止

## リリース

[release-please](https://github.com/googleapis/release-please) による自動バージョニングを採用。

### 仕組み

1. Conventional Commits に従ったコミットが `master` にマージされる
2. release-please が CHANGELOG とバージョンを更新する Release PR を自動作成
3. Release PR をマージすると GitHub Release が自動作成される

### 設定ファイル

| ファイル | 役割 |
|---------|------|
| `release-please-config.json` | リリース設定（パッケージ、CHANGELOGセクション定義） |
| `.release-please-manifest.json` | 現在のバージョン管理 |
| `.github/workflows/release.yml` | GitHub Actions ワークフロー |

### バージョニングルール

- `feat:` → マイナーバージョン UP（0.1.0 → 0.2.0）
- `fix:` / `perf:` → パッチバージョン UP（0.1.0 → 0.1.1）
- `feat!:` / `BREAKING CHANGE` → メジャーバージョン UP（0.1.0 → 1.0.0）
- `docs:` / `chore:` → バージョン変更なし（CHANGELOGには記録）

### モノレポ戦略

全パッケージ（core, embedding-onnx, storage-postgres, mcp-server, hooks）を `linked-versions` で一括バージョニングする。ルートの `package.json` のバージョンで管理。

## テスト戦略

### テストレベル

| レベル | 対象 | 実行環境 | 実行タイミング |
|--------|------|---------|---------------|
| 単体テスト | core（RRF、時間減衰、重複チェック等） | Node.jsのみ | pre-commit, CI |
| 単体テスト | mcp-server（ツール登録、エラーハンドリング） | Node.jsのみ | pre-commit, CI |
| 結合テスト | storage-postgres, embedding-onnx | docker-compose.test.yml | CI |
| フックテスト | hooks（チャンク分割、ログパース） | Node.jsのみ | pre-commit, CI |
| E2Eテスト | mcp-server（フルライフサイクル: save→search→update→delete） | docker-compose.test.yml | CI |

### テストの書き方

- **TDD** — RED → GREEN → REFACTOR の順で書く
- **モックストレージ** — `createMockStorage()` ヘルパーを使用。新メソッド追加時は全テストファイルのモックも更新する
- **テストDB** — `beforeEach` で `repo.clear()` して初期化。タイムスタンプはテスト間で異なる値を使う（ソート順の安定化）
- **カバレッジ目標** — 75%以上/パッケージ

### テストファイル配置

```
packages/<name>/
├── src/           # ソースコード
└── tests/         # テストファイル（*.test.ts）
```

## リンタールール

### OXLint（`.oxlintrc.json`）

```json
{
  "plugins": ["jsdoc"],
  "rules": {
    "all": "warn",
    "no-magic-numbers": ["warn", { "ignore": [0, 1, -1, 2] }]
  },
  "ignorePatterns": ["dist/", "node_modules/", "coverage/", "**/*.test.ts"]
}
```

- **jsdocプラグイン** — JSDocの内容検証（タグ名、パラメータ等）
- **no-magic-numbers** — 数値リテラルの定数化を強制（テストファイルは除外）

### セルフレビュー観点

コードレビュー時に確認する観点：

1. **単一責務** — 各ファイル・クラスが1つの関心事に集中しているか
2. **セキュリティ** — `sql.raw()` の使用、ユーザー入力のエスケープ、zodバリデーション
3. **早期リターン** — ガード節で深いネストを避けているか
4. **マジックナンバー/ストリング** — 名前付き定数に抽出されているか
5. **ハードコード禁止** — ファイル名、パス、バージョン等を直接埋め込まず、設定やコマンドで解決しているか
6. **コメント** — 非自明なロジックにJSDocがあるか

## ブランチ戦略

- `master` — メインブランチ。全PRはここにsquash merge
- `feat/<issue-number>-<name>` — 機能ブランチ
- `fix/<name>` — バグ修正ブランチ
- `docs/<name>` — ドキュメントブランチ

PRは1 Issue = 1 PRの粒度で作成する。
