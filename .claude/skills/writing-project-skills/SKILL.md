---
name: writing-project-skills
description: claude-memory プロジェクトの .claude/skills/ 配下に置く skill の delta 規約（公式 skill-creator への追加ルール）を定める. Use when 新しい skill を追加・編集するとき、既存 skill を点検するとき、または description や構造に迷ったとき
---

# プロジェクト skill 規約（公式 skill-creator の delta）

このプロジェクトの `.claude/skills/` 配下に置く skill の**差分規約**のみを定義する。skill 設計の一般原則（anatomy、progressive disclosure、draft → test → eval → iterate ループ、iteration workspace、description optimizer など）はすべて公式 skill-creator に従う。ここには重複を書かない。

**REQUIRED BACKGROUND:** [anthropics/skills:skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) を先に読むこと。以下はそれを踏まえた上でのプロジェクト固有の追加規約のみ。

## description 規約（プロジェクト delta）

skill-creator は description の長さを厳密に定めないが、このプロジェクトでは [公式 Skills 仕様](https://code.claude.com/docs/ja/skills) の例に揃え、**「何をするか」「いつ使うか」の 2 部構成・250 字以内**で書く。スキルリストで短縮された際に肝心のキーワードが削られるのを防ぐため。

```yaml
---
name: skill-name
description: <動作を一文>. Use when <トリガー条件>
---
```

- 前半: skill の動作・成果物を一文で。句点（`.` または `。`）で区切る
- 後半: `Use when <トリガー条件>` でトリガー・症状・キーワードを列挙
- 公式例: `Explains code with visual diagrams and analogies. Use when explaining how code works, teaching about a codebase, or when the user asks "how does this work?"`

### description アンチパターン

| NG | 理由 |
|----|------|
| `Use when ...` のみで WHAT が無い | 公式仕様違反。Claude がスキルリストから動作を推測できない |
| `A → B → C を順次実行する` だけ | ワークフロー要約のみでトリガー条件が無い |
| WHAT に「〜のオーケストレーター」だけ書く | 何をオーケストレートするか具体化する |
| 250 字超過 | スキルリスト短縮でキーワードが削られる |

## オーケストレーター規約

対象: `dev-start`, `dev-complete`, `design-decision`, `post-review`, `rule-cycle`, `project-bootstrap`（複数 skill を順次起動する skill）。

- 各 step を `### Step N: skill-name（役割）` の見出しで記述
- サブスキル呼び出しは `**REQUIRED SUB-SKILL:** skill-name に従い` マーカーで明示
- `## 完了条件` セクションで全 step のチェックリストを提示
- description の WHAT には「何をオーケストレートするか」を具体語で書く（例: `memory 検索 → ブランチ作成 → 仕様確認を統括する`）

## 内部連鎖 skill

`rule-measure → rule-explore → rule-improve → rule-audit` のように特定オーケストレーターからのみ起動される skill は、description に連鎖の前後関係（「rule-measure の直後」等）を明記する。呼び出し元が曖昧だと誤トリガーしやすいため。

## プロジェクト固有の参照

- `.project-config.yml` を参照する skill はパス直書きではなく「値は `.project-config.yml` を参照」と書く
- `docs/adr/`, `docs/specs/`, `docs/generated/` 等のパスはこのプロジェクトの既存構造に従う
- パッケージスコープ: `core`, `embedding-onnx`, `storage-postgres`, `mcp-server`, `hooks`

## 作成・編集後のフロー

1. skill ファイルを作成/編集したら `CLAUDE.md` の `## Skills` セクションに 1 行ポインタを追加（または既存ポインタを更新）
2. `conventional-commits` に従い `docs(skills): add <name> skill` または `docs(skills): update <name> skill` でコミット
