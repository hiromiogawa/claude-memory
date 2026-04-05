# Contributing to claude-memory

## 開発環境のセットアップ

### 前提条件

- Node.js 22+
- pnpm 10.8+
- Docker / Docker Compose

### 手順

1. リポジトリをフォーク・クローン
2. 依存をインストール: `pnpm install`
3. テスト用DBを起動: `docker compose -f docker-compose.test.yml up -d`
4. ビルド確認: `pnpm build`
5. テスト実行: `pnpm test`

## 開発フロー

1. Issueを確認し、作業するIssueを選ぶ
2. ブランチを作成: `feat/<issue-number>-<name>` or `fix/<name>`
3. TDDで実装（テストを先に書く）
4. `pnpm build && pnpm test && pnpm lint` で確認
5. PRを作成（1 Issue = 1 PR）

## コミット規約

[Conventional Commits](https://www.conventionalcommits.org/) に従う。

スコープ: `core`, `embedding-onnx`, `storage-postgres`, `mcp-server`, `hooks`

例:
- `feat(core): add UpdateMemoryUseCase`
- `fix(storage-postgres): escape LIKE special chars`
- `test(mcp-server): add unit tests`
- `docs: update README`

Gitフック（husky + lint-staged）が自動でlint・format・commitlintを実行する。

## パッケージ構成

| パッケージ | 役割 | 依存方向 |
|-----------|------|---------|
| `core` | ドメイン層（依存ゼロ） | なし |
| `embedding-onnx` | ONNX埋め込み | → core |
| `storage-postgres` | PostgreSQL実装 | → core |
| `hooks` | Claude Codeフック | → core |
| `mcp-server` | MCPサーバー + DI | → 全パッケージ |

依存方向は `pnpm dep-check` で自動検証される。

## テストの書き方

- テストファイルは `packages/<name>/tests/` に配置
- ファイル名: `*.test.ts`
- フレームワーク: Vitest
- mockストレージを使う場合は `createMockStorage()` ヘルパーを参照

## コードレビュー観点

PRをレビューする際の観点：

1. **単一責務** — 各ファイルが1つの関心事に集中しているか
2. **セキュリティ** — sql.raw()の使用、入力のエスケープ
3. **早期リターン** — ガード節で深いネストを避けているか
4. **マジックナンバー** — 名前付き定数に抽出されているか
5. **コメント** — 非自明なロジックにJSDocがあるか

## 質問・相談

- Issue でお気軽にどうぞ
