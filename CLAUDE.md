# CLAUDE.md

## AI固有の指示
- コミット時は Conventional Commits に従う（scope: core, embedding-onnx, storage-postgres, mcp-server, hooks）
- PRは必ず関連Issueを紐付ける
- 型定義変更時はJSDocも同時に更新する
- テストはTDDで書く（RED → GREEN → REFACTOR）

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

## プロジェクト設定
→ .project-config.yml

## ワークフロー（Skills）
- conventional-commits → コミット・ブランチルール
- github-flow → Issue・PR・Projects運用
- sdd → 仕様駆動開発フロー
- adr → ADR管理
- code-quality → 品質ツール設定

## プロジェクト固有のドキュメント
- docs/specs/ → 設計段階の仕様書
- docs/adr/ → 設計判断記録
- docs/images/ → アーキテクチャ図（FigJamからPNGエクスポート）
- docs/engineer/ → 開発者向けドキュメント
- docs/plans/ → 実装計画

## パッケージ構成
| パッケージ | 役割 |
|-----------|------|
| @claude-memory/core | ドメイン層（エンティティ、インターフェース、ユースケース） |
| @claude-memory/embedding-onnx | ONNX埋め込み実装 |
| @claude-memory/storage-postgres | PostgreSQL + pgvector + pg_bigm |
| @claude-memory/mcp-server | MCP Server + DI |
| @claude-memory/hooks | Claude Code Hooks連携 |

## コマンド
- `pnpm test` — 全パッケージテスト
- `pnpm lint` — OXLint + Biome
- `pnpm knip` — 未使用コード検出
- `pnpm dep-check` — 依存方向検証
- `pnpm build` — 全パッケージビルド

## Claude Code Integration

### MCP Server (settings.json)
```json
{
  "mcpServers": {
    "claude-memory": {
      "command": "docker",
      "args": ["exec", "claude-memory-mcp-server-1", "node", "packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Hooks (settings.json)
```json
{
  "hooks": {
    "PostSessionEnd": [{
      "command": "docker exec claude-memory-mcp-server-1 node packages/hooks/dist/index.js"
    }]
  }
}
```

### Setup
```bash
git clone <repo>
cd claude-memory
docker compose up -d
```
