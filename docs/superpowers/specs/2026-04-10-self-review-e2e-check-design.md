# self-review に E2E カバレッジ確認を追加する設計

## 背景

storage-postgres の `deleteOlderThan` / `countOlderThan` で `Date` オブジェクトを `sql` テンプレートに直接渡すバグがあった（#168）。ユニットテストはモックで通過しており、実 DB との結合で初めて発覚した。

現在の self-review は lint/test/dep-check/knip の4項目で、E2E テストのカバレッジ確認がない。バグ修正や機能追加で E2E テストの追加が必要かを確認する仕組みがないため、カバレッジが自然に伸びない。

## 設計

### self-review に第5のチェック項目を追加

現在の検証サイクル:
```
lint → test → dep-check → knip → コミット可能
```

拡張後:
```
lint → test → dep-check → knip → e2e-coverage → コミット可能
```

### e2e-coverage チェックの内容

自動ツール実行ではなく、チェックリスト項目として判断を促す。

**確認フロー:**

1. 変更ファイルが以下のいずれかにかかっているか確認:
   - インフラ層（storage / repository / DB スキーマ / ドライバ接続）
   - ユースケース層（use-cases/）
   - 外部接続（embedding プロバイダ等）
2. 該当する場合、既存の E2E テストがその変更パスをカバーしているか確認
3. カバーしていなければ E2E テストケースの追加を実施

**判断不要なケース（スキップ）:**
- 変更がプレゼンテーション層のみ（MCP ツールハンドラの出力フォーマット等）
- ドキュメントのみの変更
- テストコードのみの変更
- lint / 型定義のみの変更

### 汎用性

この観点は claude-memory 固有ではなく、DB やユースケース層を持つどのプロジェクトでも適用できる。スキルの記述はプロジェクト固有のパス名を使わず、層の概念で記述する。

## 変更対象

- `.claude/skills/self-review/SKILL.md` — 第5項目「e2e-coverage」を追加
- `.claude/skills/dev-complete/SKILL.md` — Step 1 の説明に e2e-coverage を含める
- `CLAUDE.md` — self-review スキルの description を更新

## 変更しないもの

- E2E テストファイル自体（このスキルが機能すれば、今後の開発で自然に増える）
- 他のスキル（TDD, failure-record 等）
