# ルール自動改善サイクル

## 対象 Issue

- #135 ルール自動改善サイクルのスキル化

## 背景

[カウシェの AI レビュー自動化記事](https://zenn.dev/kauche/articles/e051583461c181) を参考に、エージェントのルール（スキル、CLAUDE.md、エージェント定義）を自動的に計測・探索・改善提案・検証するサイクルをスキルとして整備する。

スキルはプロジェクト横断で使える汎用部品として設計する。プロジェクト規模に関係なく、強いスキルを持つエージェントがどのプロダクトに入っても機能することを目指す。

## 設計方針

- 単一責務の4スキル構成（記事の Measure / Explore / Improve / Audit に対応）
- Improve はファイルを直接変更せず、改善提案を GitHub Issue として起票する
- Audit が Issue を精査し、承認 or クローズする
- 実際のルール変更は通常の開発フロー（Issue → ブランチ → PR → マージ）で行う
- 思考ジャーナルは claude-memory MCP に保存（tag: `rule-journal`）

## 全体構成

```
[トリガー: FAIL エントリが 3 件蓄積]
    ↓
  Measure → Explore → Improve → Audit
    ↓         ↓         ↓         ↓
  計測       探索     Issue起票  Issue精査
    ↓         ↓         ↓         ↓
  memory    memory   GitHub     GitHub
  (journal) (journal) Issues    Issues
```

## スキル詳細

### 1. `rule-measure` — 計測

直近のエージェント活動を定量的に集計する。

**入力**:
- `docs/adr/0007-agent-failure-rules.md` の失敗履歴
- Git ログ（直近の PR、pre-commit hook の失敗傾向）
- memory の過去ジャーナル（tag: `rule-journal, measure`）

**出力**: memory にジャーナルとして保存（tag: `rule-journal, measure`）

**計測項目**:
- ルールごとの発火回数（ADR-0007 のエントリ数、同種の失敗の再発有無）
- 直近 N 件の PR で pre-commit hook が失敗した回数と原因分類
- スキル/ルールの総数と前回計測からの増減
- 各 FAIL エントリの「対策」が実際に効果を発揮しているか（同種の再発有無）

**効果スコア**: 各ルールについて `効果数 / 発火数` を算出。効果数 = そのルールが防いだと推定される失敗数。発火数 = ルールが適用された回数。

### 2. `rule-explore` — 探索

計測数字だけでは見えないボトルネックや未知のパターンを探す。

**入力**:
- Measure のジャーナル
- コードベースの現状（スキルファイル、CLAUDE.md、エージェント定義）
- Git の PR コメント・レビュー履歴

**出力**: memory にジャーナルとして保存（tag: `rule-journal, explore`）

**探索内容**:
- レビューで繰り返し指摘されるが、まだルール化されていないパターン
- スキル間の矛盾や重複（例: 2つのスキルが同じことを違う言い方で指示している）
- エージェント定義のスコープ漏れ（依存方向ルールが実態と合っていない等）
- 効果スコアが低いルール（アーカイブ候補）

### 3. `rule-improve` — 改善提案

Measure と Explore の結果をもとに、改善提案を GitHub Issue として起票する。

**入力**: Measure + Explore のジャーナル（memory_search で取得）

**出力**: GitHub Issues（ラベル: `rule-improvement`）

**Issue に含める情報**:
- 提案の種類: `新規ルール追加` / `ルール修正` / `ルールアーカイブ`
- 根拠: どの計測結果・探索結果に基づくか
- 対象ファイル: どのスキル/CLAUDE.md/エージェント定義を変更するか
- 具体的な変更内容: 追加・修正するルールの文言案

**改善アクションの種類**:
- 新ルールの追加: 失敗パターンからルールを提案
- ルール修正: 曖昧な表現の具体化、効果が薄いルールの強化
- ルールアーカイブ: 効果スコアが低い（発火するが効果がない）ルールの削除提案

**ファイルは一切変更しない。** 変更は通常の開発フロー（Issue → ブランチ → PR）で行う。

### 4. `rule-audit` — 検証

Improve が起票した Issue を精査し、妥当性を検証する。

**入力**: `rule-improvement` ラベルの未精査 Issue

**出力**: Issue への承認（`approved` ラベル付与）またはクローズ（理由コメント付き）

**検証項目**:
- 提案されたルールが既存ルールと矛盾していないか
- アーカイブ対象のルールが本当に不要か（直近の失敗履歴と照合）
- 変更の影響範囲は適切か（1つのスキルの変更が他スキルに波及しないか）
- 提案の根拠が十分か（計測データに裏付けがあるか）

**検証結果を memory にジャーナルとして保存**（tag: `rule-journal, audit`）

## イベント駆動トリガー

failure-record スキルが ADR-0007 に FAIL エントリを追記した時点で、蓄積数をチェックする。

- **閾値**: 前回サイクル実行以降の新規 FAIL エントリが **3 件** に達したらサイクルを起動
- **サイクル実行順**: Measure → Explore → Improve → Audit（順次実行、並列不可）
- **前回実行時刻**: memory に保存（tag: `rule-journal, cycle-meta`）

閾値の 3 件は初期値。rule-audit が「閾値の調整が必要」と判断した場合、閾値変更の Issue を起票する。

## 思考ジャーナル

各スキルは実行のたびに claude-memory MCP にジャーナルを保存する。次回実行時にジャーナルを検索して前回の判断を引き継ぐ。

**タグ体系**:
- `rule-journal, measure` — 計測結果
- `rule-journal, explore` — 探索結果
- `rule-journal, audit` — 検証結果
- `rule-journal, cycle-meta` — サイクル実行メタ情報（前回実行日時、閾値設定等）

**ジャーナルのライフサイクル**: 3 世代（3 回分のサイクル）を保持。それ以前のジャーナルは memory_delete で削除する。

## 既存スキルとの関係

| 既存スキル | 関係 |
|-----------|------|
| `failure-record` | サイクルのトリガー源。FAIL エントリの蓄積がサイクルを起動する |
| `memory-usage` | ジャーナルの保存・検索基盤。tag: `rule-journal` で名前空間を分離 |
| `self-review` | Improve の改善提案対象の一つ |
| `code-quality` | Measure の計測対象（lint 失敗傾向等） |
| `conventional-commits` | Measure の計測対象（commitlint 失敗傾向等） |

## 成果物一覧

| ファイル | 内容 |
|---------|------|
| `.claude/skills/rule-measure/SKILL.md` | 計測スキル |
| `.claude/skills/rule-explore/SKILL.md` | 探索スキル |
| `.claude/skills/rule-improve/SKILL.md` | 改善提案スキル |
| `.claude/skills/rule-audit/SKILL.md` | 検証スキル |
| `CLAUDE.md` | スキル一覧に 4 件追加 |
