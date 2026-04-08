# ADR-0007: エージェント失敗ルールの蓄積

## ステータス

Accepted

## コンテキスト

AI エージェントが繰り返すミスを防ぐため、失敗事例と追加したルールを一元管理する場所が必要。個別の CLAUDE.md やスキルにルールは反映するが、「なぜそのルールが存在するか」の履歴をここに残す。

## 決定

失敗→ルール追加の履歴を本 ADR に蓄積する。各エントリは事象・原因・対策・反映先を記録する。

## 失敗履歴

### FAIL-001: memory_search 未実行でコンテキスト不足 (2026-04-05)

- **事象**: 既存の設計判断を知らずに矛盾する実装を行った
- **原因**: 作業開始前に memory_search でプロジェクトの記憶を検索しなかった
- **対策**: memory-usage スキルに「作業開始前に関連記憶を検索する」ステップを明記
- **反映先**: `.claude/skills/memory-usage/SKILL.md`

### FAIL-002: commitlint subject-case 違反 (2026-04-05)

- **事象**: コミットメッセージの description を大文字始まりにして commitlint が失敗
- **原因**: Conventional Commits の subject-case ルール（小文字）を把握していなかった
- **対策**: conventional-commits スキルに「小文字、ピリオドなし」を明記
- **反映先**: `.claude/skills/conventional-commits/SKILL.md`

### FAIL-003: biome auto-fix による TS 型エラー (2026-04-06)

- **事象**: Biome の auto-fix が型アサーションを削除し、TypeScript のコンパイルエラーが発生
- **原因**: lint 修正後に型チェックを再実行しなかった
- **対策**: self-review スキルに「Biome auto-fix 後は型チェックも確認」を追記
- **反映先**: `.claude/skills/self-review/SKILL.md`
