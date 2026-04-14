---
name: dev-complete
description: 実装完了時の仕上げ（self-review → docs-freshness → conventional-commits → PR 作成）を統括する。Use when 実装が一段落し、コミット・PR 作成に向けて仕上げ作業を始めるとき
---

# 開発完了

実装が終わったとき、コミット・PR作成までの仕上げを統括する。

## いつ使うか

- 実装が一段落したとき（「実装できた」「テスト通った」）
- superpowers:verification-before-completion と併用する

## 実行フロー

### Step 1: self-review（検証サイクル） — **必須・省略不可**

**REQUIRED SUB-SKILL:** self-review を **必ず Skill ツールで明示的に起動する**。

- 検証コマンド（lint → test → dep-check → knip → build）を順に全部走らせる
- **差分ファイルを新鮮な目で再読して** コードレビュー（想定外の副作用・リグレッション・未考慮のエッジケースを探す）
- 全パスするまでコミットしない
- **PR 作成前にもう一度フルサイクルを必ず走らせる**（commit → push の間に追加編集が入る可能性があるため）

この Step を省略することは許されない。CI が落ちる / レビュアーが気づくより前に自分で気づくのがセルフレビューの目的。「時間がない」「小さい変更」「CI が走るから」は全て無効な言い訳。

### Step 2: docs-freshness（ドキュメント確認）

**REQUIRED SUB-SKILL:** docs-freshness に従い:

1. 変更したコードに関連するドキュメントがあるか確認
2. 型定義を変更した場合は JSDoc も更新されているか確認
3. 自動生成ドキュメント（mcp-tools.md, dependency-graph.svg）の再生成が必要か確認

### Step 3: conventional-commits（コミット）

**REQUIRED SUB-SKILL:** conventional-commits に従い:

1. 変更をステージング
2. `type(scope): description` フォーマットでコミット
3. scope は対象パッケージ名（core, storage-postgres, embedding-onnx, mcp-server, hooks）

### Step 4: github-flow（PR作成）

**REQUIRED SUB-SKILL:** github-flow に従い:

1. ブランチをプッシュ
2. PR を作成（関連 Issue を Closes で紐付け）
3. レビューを依頼

### 完了条件

- [ ] self-review skill を **Skill ツールで明示的に起動** し、全パスを確認
- [ ] 差分ファイルを自分の目で再読し、コードレビューで懸念点を報告（問題なしの場合もその旨を明言）
- [ ] ドキュメント更新確認済み
- [ ] Conventional Commits でコミット済み
- [ ] PR 作成済み（Issue 紐付け済み）
- [ ] PR 作成後にもう一度 self-review を走らせ、push 時点の差分が全パスすることを確認

## Red Flags — STOP

以下の思考パターンが浮かんだら STOP。セルフレビューをスキップしようとしているサイン:

| 合理化 | 実態 |
|---|---|
| 「small diff だから verify だけで良い」 | small diff こそ見落としが致命傷になる |
| 「CI が走るから手元は飛ばす」 | CI は最後の砦であって一次チェックではない。手元で気づくほうがループが短い |
| 「さっき走らせたから PR 直前は不要」 | commit → push の間に追加 edit が入りうる。push 時点の差分で再検証する |
| 「ユーザーに確認されるから後で直せる」 | ユーザーが検出する前に自分で検出するのがセルフレビューの定義 |
| 「self-review skill を呼ばなくても手でコマンド打てば同じ」 | skill を明示起動することで「やった証拠」と次のチェックリストが残る。手作業だと省略が混入する |
