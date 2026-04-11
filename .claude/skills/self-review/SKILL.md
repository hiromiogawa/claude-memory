---
name: self-review
description: Use when 実装が完了しコミット前に lint・test・dep-check・knip の検証サイクルを走らせたいとき
---

# セルフレビュー

実装が完了したら、以下の検証サイクルを実行する。全パスするまでコミットしない。

## 検証サイクル

1. **lint**: `pnpm lint`
   - OXLint + Biome のエラーを修正
   - Biome の auto-fix が TypeScript の型エラーを引き起こす場合があるため、修正後に型チェックも確認

2. **test**: `pnpm test` または対象パッケージのみ `pnpm --filter <pkg> test`
   - 失敗したテストは修正してから次へ

3. **dep-check**: `pnpm dep-check`
   - 依存方向違反があれば import を修正

4. **knip**: `pnpm knip`
   - 未使用の export, ファイル, 依存があれば削除

## 修正ループ

```
実装 → lint → 失敗? → 修正 → lint（再実行）
                ↓ 成功
            test → 失敗? → 修正 → test（再実行）
                ↓ 成功
            dep-check → 失敗? → 修正 → dep-check（再実行）
                ↓ 成功
            knip → 失敗? → 修正 → knip（再実行）
                ↓ 成功
            コミット可能
```

## 注意事項

- パッケージ単体で作業している場合も、最終確認はルートの `pnpm test` で全体テストを実行する
- pre-commit フックで lint-staged + knip + dep-check が自動実行されるが、コミット前に手動で確認しておくとフック失敗による手戻りを防げる

## Red Flags — STOP

以下の考えが浮かんだら、検証を省こうとしているサイン。全項目で「いいえ、全部走らせる」が正解。

- 「変更が小さいから lint だけで良い」
- 「前回通ったから test は省略して良い」
- 「pre-commit が走るからローカル確認不要」
- 「時間がないから dep-check は後で」

## よくある間違い

| 言い訳 | 実態 |
|--------|------|
| 「pnpm test だけ通せば OK」 | dep-check/knip を飛ばすと依存違反・未使用コードが PR に漏れる |
| 「Biome auto-fix だけで型エラーは後回し」 | auto-fix が型を壊すケースがあり、次の人が詰む |
| 「pre-commit が自動で走る」 | フック失敗は手戻りが大きい。事前確認で摩擦を減らす |
| 「パッケージ単体の test で十分」 | 最終確認はルートの `pnpm test` 全体 |
