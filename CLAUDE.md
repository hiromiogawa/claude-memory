# CLAUDE.md

## AI固有の指示

- コミット時は Conventional Commits に従う（scope: core, embedding-onnx, storage-postgres, mcp-server, hooks）
- PRは必ず関連Issueを紐付ける
- 型定義変更時はJSDocも同時に更新する
- テストはTDDで書く（RED → GREEN → REFACTOR）
- 設計判断があった場合はADRを `docs/adr/` に追加し、長期記憶にも保存する
- コード変更時は関連ドキュメントの更新が必要か確認する

## 記憶ルール（claude-memory MCP）

- セッション開始時に memory_search で現在のプロジェクトに関連する記憶を **必ず** 検索し、文脈を把握する
- 以下の情報は自動的に memory_save で保存する（ユーザーに確認不要）：
  - 重要な設計判断とその理由（ADRにも残す）
  - ユーザーの好み・作業スタイル
  - バグの原因と解決策
  - プロジェクト固有の知識（アーキテクチャ、制約、ルール）
  - 議論の結論や合意事項
- 一般的な技術知識（公式ドキュメントに書いてあること）は保存しない
- 保存時は tags を付けて検索しやすくする

## ワークフロー（Skills）

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
| 長期記憶戦略 | [docs/engineer/memory-strategy.md](docs/engineer/memory-strategy.md) | 保存・検索・タグ体系・ADR連携 |
| MCPツール | [docs/engineer/mcp-tools.md](docs/engineer/mcp-tools.md) | 全10ツールの詳細仕様 |
| パッケージ詳細 | [docs/engineer/packages/](docs/engineer/packages/) | 各パッケージの設計意図、API、実装詳細 |
| ADR | [docs/adr/](docs/adr/) | 設計判断記録 |

## コマンド

- `pnpm test` — 全パッケージテスト
- `pnpm build` — 全パッケージビルド
- `pnpm lint` — OXLint + Biome
- `pnpm knip` — 未使用コード検出
- `pnpm dep-check` — 依存方向検証
