# CLAUDE.md

## Skills

- memory-usage → 記憶の保存・検索・活用ルール（claude-memory MCPとセットで使用）
- conventional-commits → コミット・ブランチルール
- github-flow → Issue階層・PR・Projects運用
- sdd → 仕様駆動開発フロー
- adr → ADR作成・管理
- code-quality → OXLint/Biome/knip/dependency-cruiser
- docs-freshness → ドキュメント鮮度維持（Why/What/How分類、自動生成、CI差分チェック）
- project-bootstrap → 新プロジェクト初期化（統括スキル）
- self-review → 実装後の検証サイクル（lint/test/dep-check/knip）
- failure-record → エージェントの失敗記録と再発防止ルール管理
- rule-measure → ルール効果の定量計測
- rule-explore → ルールのボトルネック・未知パターン探索
- rule-improve → 計測・探索結果からルール改善提案をIssue化
- rule-audit → 改善提案の検証・承認・却下
- rule-cycle → ルール改善サイクルのオーケストレーター（measure→explore→improve→audit）
- dev-start → Issue着手時のオーケストレーター（memory検索→github-flow→sdd）
- dev-complete → 実装完了時のオーケストレーター（self-review→docs-freshness→conventional-commits→PR）
- post-review → レビュー後のオーケストレーター（failure-record→rule-cycle）
- design-decision → 設計判断時のオーケストレーター（adr→memory保存）
- writing-project-skills → このプロジェクトで skill を新規作成・編集するときの規約

## プロジェクト固有の指示

- コミット時は Conventional Commits に従う（scope: core, embedding-onnx, storage-postgres, mcp-server, hooks）
- PRは必ず関連Issueを紐付ける
- 型定義変更時はJSDocも同時に更新する
- テストはTDDで書く（RED → GREEN → REFACTOR）
- 設計判断があった場合はADRを `docs/adr/` に追加し、memory_save でも保存する
- コード変更時は関連ドキュメントの更新が必要か確認する
- セルフレビュー・コードレビューの結果はPR上にコメントとして残す（`gh pr comment`を使用）。指摘があれば修正後に修正内容を返信コメントで記録し、PR上にレビュー→修正の履歴を残す

## プロジェクトドキュメント（詳細はリンク先を参照）

| ドキュメント | 場所 | 内容 |
|-------------|------|------|
| アーキテクチャ | [docs/engineer/architecture.md](docs/engineer/architecture.md) | クリーンアーキテクチャ、パッケージ構成、依存方向、DBスキーマ、検索アルゴリズム |
| 技術選定 | [docs/engineer/tech-decisions.md](docs/engineer/tech-decisions.md) | 各技術の選定理由と代替案 |
| 運用ルール | [docs/engineer/operations.md](docs/engineer/operations.md) | 開発環境構築、CI、テスト戦略、コミット規約、Gitフック、リンタールール |
| ドキュメント戦略 | [docs/engineer/documentation-strategy.md](docs/engineer/documentation-strategy.md) | Why/What/Howの分類方針、自動生成ルール |
| MCPツール | [docs/generated/mcp-tools.md](docs/generated/mcp-tools.md) | 全10ツールの詳細仕様（自動生成） |
| 依存関係図 | [docs/generated/dependency-graph.svg](docs/generated/dependency-graph.svg) | パッケージ依存関係の可視化（自動生成） |
| DBスキーマ | [docs/generated/schema/](docs/generated/schema/) | データベーススキーマ定義（自動生成） |
| セキュリティ | [docs/engineer/security.md](docs/engineer/security.md) | SQLインジェクション対策、認証情報管理 |
| ADR | [docs/adr/](docs/adr/) | 設計判断記録 |

## コマンド

- `pnpm test` — 全パッケージテスト
- `pnpm build` — 全パッケージビルド
- `pnpm lint` — OXLint + Biome
- `pnpm knip` — 未使用コード検出
- `pnpm dep-check` — 依存方向検証
