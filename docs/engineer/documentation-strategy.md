# ドキュメント戦略

## 基本原則

1. **人間はドキュメントを書かない。AIが書き、人間は読んで確認する**
2. **Why（意図）はAIが会話から抽出して記録する**
3. **What（実態）はコードから自動生成する**
4. **腐るドキュメントは作らない。腐る部分は自動生成で置き換える**

## ドキュメント分類

### Why（意図・判断）— AIが会話から抽出

コードからは逆算不可能な「なぜそうしたか」を記録する。

| ドキュメント | 場所 | 作成者 | 更新タイミング |
|-------------|------|--------|--------------|
| **ADR（設計判断記録）** | `docs/adr/NNNN-*.md` | AI（会話から抽出） | 設計判断があったとき |
| **技術選定理由** | `docs/engineer/tech-decisions.md` | AI | 技術選定を変更したとき |
| **却下した案** | ADR内のAlternatives | AI | 設計判断時 |

**ADRテンプレート:**
```markdown
# ADR-NNNN: [タイトル]

## ステータス
採用 / 却下 / 廃止

## コンテキスト
何が問題だったか、どういう状況だったか

## 決定
何を採用したか

## 代替案（却下した案）
検討したが採用しなかった案とその理由

## 影響
この決定によって生じる影響
```

**記録ルール:**
- 「AとBどちらにするか」の議論があったら必ずADRを残す
- 「なぜこの技術を選んだか」は tech-decisions.md に追記
- 長期記憶（claude-memory）にも同時保存する

### What（実態）— コードから自動生成

コードの現在の状態を反映するドキュメント。手書きしない。

| ドキュメント | 生成元 | 生成ツール | 場所 |
|-------------|--------|-----------|------|
| **DBスキーマ定義** | schema.ts | tbls | `docs/generated/schema.md` |
| **パッケージ依存関係図** | packages/*/src/ | dependency-cruiser | `docs/generated/dependencies.svg` |
| **MCPツールリファレンス** | zodスキーマ（tools/*.ts） | カスタムスクリプト | `docs/generated/mcp-tools.md` |
| **エンティティ・インターフェース一覧** | core/src/ | TypeDoc or カスタム | `docs/generated/api.md` |

**自動生成の仕組み:**
- `pnpm docs:generate` コマンドで全ドキュメントを再生成
- CIで差分チェック — 生成結果とコミット済みの差分があればエラー
- PRレビュー時に自動生成ドキュメントの変更も含まれていることを確認

### How（手順）— 変更時に更新

セットアップ手順や運用ルールなど。変更頻度は低いが、変更時に確実に更新する。

| ドキュメント | 場所 | 更新トリガー |
|-------------|------|------------|
| **README** | `README.md` | セットアップ手順の変更 |
| **CONTRIBUTING** | `CONTRIBUTING.md` | 開発フローの変更 |
| **運用ルール** | `docs/engineer/operations.md` | CI/テスト/コミット規約の変更 |
| **CLAUDE.md** | `CLAUDE.md` | AIへの指示の変更 |

**更新ルール:**
- How系ドキュメントを変更するPRでは、変更理由をコミットメッセージに記載
- PRテンプレートに「How系ドキュメントの更新が必要か？」のチェック項目

### 図 — FigJamで作成、PNGをコミット

| 図 | 場所 | 更新タイミング |
|----|------|--------------|
| ユーザーフロー全体像 | `docs/images/user-flow.png` | アーキテクチャ変更時 |
| クリーンアーキテクチャ | `docs/images/clean-architecture.png` | パッケージ構成変更時 |
| 保存フロー | `docs/images/save-flow.png` | 保存ロジック変更時 |
| 検索パイプライン | `docs/images/search-pipeline.png` | 検索アルゴリズム変更時 |

**注意:** 依存関係図（What系）はdependency-cruiserで自動生成するため、手動の図は「概念図」に限定する。

### 計画（時限性）— 完了後はアーカイブ

| ドキュメント | 場所 | ステータス |
|-------------|------|----------|
| 実装計画 | `docs/plans/` | 完了済み — 参照のみ |
| superpowers計画 | `docs/superpowers/plans/` | 完了済み — 参照のみ |
| 設計仕様 | `docs/specs/` | 実装済み — 参照のみ |

## ディレクトリ構成

```
docs/
├── adr/                    # Why: 設計判断記録（AIが会話から抽出）
├── engineer/
│   ├── tech-decisions.md   # Why: 技術選定理由
│   ├── operations.md       # How: 運用ルール
│   ├── documentation-strategy.md  # How: このドキュメント
│   └── packages/           # Why: パッケージの設計意図（手書き）
├── generated/              # What: 自動生成（手で編集しない）
│   ├── schema.md           # DBスキーマ（tblsで生成）
│   ├── dependencies.svg    # 依存関係図（dep-cruiserで生成）
│   ├── mcp-tools.md        # MCPツールリファレンス（zodから生成）
│   └── api.md              # エンティティ・インターフェース一覧
├── images/                 # 概念図（FigJamからPNGエクスポート）
├── plans/                  # アーカイブ: 実装計画
├── specs/                  # アーカイブ: 設計仕様
└── superpowers/plans/      # アーカイブ: superpowers計画
```

## 既存ドキュメントの移行計画

現在手書きのWhat系ドキュメントを自動生成に移行する。

| 現在 | 移行先 | 方法 |
|------|--------|------|
| `docs/engineer/mcp-tools.md` | `docs/generated/mcp-tools.md` | zodスキーマからスクリプトで生成 |
| `docs/engineer/packages/*.md` のWhat部分 | `docs/generated/api.md` | TypeDocまたはカスタムスクリプト |
| `docs/engineer/architecture.md` の依存関係部分 | `docs/generated/dependencies.svg` | dependency-cruiser |

`docs/engineer/packages/*.md` のWhy部分（設計意図、アルゴリズム説明）はそのまま残す。

## PRレビュー時のドキュメント確認チェックリスト

PRテンプレートに追加：

```markdown
## ドキュメント確認
- [ ] 設計判断があればADRを追加したか？
- [ ] スキーマ変更があれば `pnpm docs:generate` を実行したか？
- [ ] How系ドキュメント（README, operations.md等）の更新が必要か確認したか？
- [ ] 新しいMCPツール追加時に自動生成リファレンスが更新されているか？
```
