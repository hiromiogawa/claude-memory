# CLAUDE.md

## AI固有の指示

- コミット時は Conventional Commits に従う（scope: core, embedding-onnx, storage-postgres, mcp-server, hooks）
- PRは必ず関連Issueを紐付ける
- 型定義変更時はJSDocも同時に更新する
- テストはTDDで書く（RED → GREEN → REFACTOR）
- 設計判断があった場合はADRを `docs/adr/` に追加し、長期記憶にも保存する
- コード変更時は関連ドキュメントの更新が必要か確認する

## Skills

- memory-usage → 長期記憶の保存・検索・タグ・ADR連携ルール
- conventional-commits → コミット・ブランチルール
- github-flow → Issue・PR・Projects運用
- sdd → 仕様駆動開発フロー
- adr → ADR管理
- code-quality → 品質ツール設定

## プロジェクトドキュメント（詳細はリンク先を参照）

| ドキュメント | 場所 | 内容 |
|-------------|------|------|
| アーキテクチャ | [docs/engineer/architecture.md](docs/engineer/architecture.md) | クリーンアーキテクチャ、パッケージ構成、依存方向、DBスキーマ、検索アルゴリズム |
| 技術選定 | [docs/engineer/tech-decisions.md](docs/engineer/tech-decisions.md) | 各技術の選定理由と代替案 |
| 運用ルール | [docs/engineer/operations.md](docs/engineer/operations.md) | 開発環境構築、CI、テスト戦略、コミット規約、Gitフック、リンタールール |
| ドキュメント戦略 | [docs/engineer/documentation-strategy.md](docs/engineer/documentation-strategy.md) | Why/What/Howの分類方針、自動生成ルール |
| MCPツール | [docs/engineer/mcp-tools.md](docs/engineer/mcp-tools.md) | 全10ツールの詳細仕様 |
| パッケージ詳細 | [docs/engineer/packages/](docs/engineer/packages/) | 各パッケージの設計意図、API、実装詳細 |
| ADR | [docs/adr/](docs/adr/) | 設計判断記録 |

## コマンド

- `pnpm test` — 全パッケージテスト
- `pnpm build` — 全パッケージビルド
- `pnpm lint` — OXLint + Biome
- `pnpm knip` — 未使用コード検出
- `pnpm dep-check` — 依存方向検証
