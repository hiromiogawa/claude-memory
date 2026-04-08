# エージェント向けローカルコンテキスト整備

## 対象 Issue

- #130 パッケージ別エージェント定義
- #131 セルフレビューループ + 失敗記録
- #132 パッケージ別 CLAUDE.md

## 設計方針

運用ルールは CLAUDE.md にベタ書きせず、単一責務のスキルを組み合わせて構成する。CLAUDE.md はスキル一覧とプロジェクト固有の指示のみに留める。

## 成果物一覧

### 1. パッケージ別 CLAUDE.md (#132)

各 `packages/*/CLAUDE.md` に以下を記載:

| セクション | 内容 |
|-----------|------|
| 責務 | パッケージの役割（1-2文） |
| 依存方向 | 何に依存し、何から依存されるか |
| 主要インターフェース | 公開 API/型の一覧（詳細はコード参照のリンク） |
| コマンド | パッケージ単体のテスト・ビルド・マイグレーション |
| 制約 | そのパッケージ特有の注意事項 |

対象5パッケージ:
- `packages/core/CLAUDE.md`
- `packages/storage-postgres/CLAUDE.md`
- `packages/embedding-onnx/CLAUDE.md`
- `packages/mcp-server/CLAUDE.md`
- `packages/hooks/CLAUDE.md`

ルート CLAUDE.md は変更しない。パッケージに入ったときに段階的に情報が増える構造。

### 2. パッケージ別エージェント定義 (#130)

`.claude/agents/` に4ファイル:

| エージェント | 対象パッケージ |
|-------------|---------------|
| `core-developer.md` | core |
| `storage-developer.md` | storage-postgres |
| `mcp-developer.md` | mcp-server |
| `hooks-developer.md` | hooks + embedding-onnx |

hooks と embedding-onnx は小規模パッケージのためまとめる。

各エージェントに含める情報:
- 対象パッケージのスコープ制限（自パッケージのみ変更可）
- 依存方向の遵守ルール
- テスト・lint の実行指示
- `isolation: worktree` の指定

### 3. セルフレビュースキル (#131)

`.claude/skills/self-review/SKILL.md`

実装後に毎回実行すべき検証サイクルを定義:

```
実装 → lint (pnpm lint) → test (pnpm test) → dep-check (pnpm dep-check) → knip (pnpm knip)
→ 失敗があれば修正して再実行
→ 全パスで完了
```

スキルとして分離することで:
- エージェント定義から参照可能
- superpowers の verification-before-completion と併用可能
- 将来的にプロジェクト横断で再利用可能

### 4. 失敗記録スキル (#131)

`.claude/skills/failure-record/SKILL.md`

エージェントのミス発生時のフロー:
1. 失敗の内容を特定
2. 根本原因を分析
3. 再発防止ルールを決定
4. ADR `docs/adr/0007-agent-failure-rules.md` に追記
5. 該当するスキルまたは CLAUDE.md にルールを反映

ADR 0007 のフォーマット:
```markdown
### FAIL-NNN: タイトル (YYYY-MM-DD)
- **事象**: 何が起きたか
- **原因**: なぜ起きたか
- **対策**: 追加したルール/変更
- **反映先**: どのスキル/ファイルに反映したか
```

初期エントリとして既知の失敗事例を記録:
- FAIL-001: memory_search 未実行でコンテキスト不足
- FAIL-002: commitlint subject-case 違反
- FAIL-003: biome auto-fix による TS 型エラー

### 5. ルート CLAUDE.md の更新

スキル一覧に2つ追加するのみ:
```
- self-review → 実装後の検証サイクル（lint/test/dep-check/knip）
- failure-record → エージェントの失敗記録と再発防止ルール管理
```
