# ADR-0010: hooks 層を factory function 化し、class-to-factory 移行を完了する

## ステータス

採用（ADR-0008 / ADR-0009 の最終段）

## コンテキスト

- [ADR-0008](./0008-use-case-factory-functions.md): core/use-cases を factory function 化
- [ADR-0009](./0009-infrastructure-adapter-factory-functions.md): infrastructure adapter（embedding-onnx / storage-postgres）を factory function 化

残る class は **hooks パッケージの 3 つ**:

| class | 性質 |
|---|---|
| `SessionStartHandler` | Claude Code の SessionStart フック用の interface 層 wrapper |
| `SessionEndHandler` | SessionEnd フック用の interface 層 wrapper |
| `QAChunkingStrategy implements ChunkingStrategy` | core の ChunkingStrategy を実装する adapter |

これらも全て:

- 継承なし
- `instanceof` なし
- state は closure で表現可能
- ADR-0008 の論拠（継承しない class は `final` が無いため誤ったシグナルを送る）がそのまま当てはまる

## 決定

hooks パッケージの 3 class も factory function に統一する。

- `SessionStartHandler` → `defineSessionStartHandler(searchUseCase): SessionStartHandler`
- `SessionEndHandler` → `defineSessionEndHandler(saveUseCase): SessionEndHandler`
- `QAChunkingStrategy` → `defineQAChunkingStrategy(options?): ChunkingStrategy`

これにより **core を import する全 module が factory function で統一** され、`errors/memory-error.ts` のみが唯一の class 例外となる（ADR-0008 参照）。

### 付随する清掃

`SessionEndHandler` のコンストラクタは `chunking: ChunkingStrategy` を受け取っていたが、`handle()` 内で使われていない **死にパラメータ** だった（チャンキングは `saveUseCase.saveConversation` 内で行われるため）。factory 化にあたりこの嘘を除去し、`defineSessionEndHandler(saveUseCase)` のみを受け取る形に変更する。

## 理由

- 3 度目の同じ議論を避けるため、コードベース全体を一括で統一する
- "interface 層 wrapper" と "infrastructure adapter" の境界線に悩む必要をなくす（どちらも factory）
- `SessionEndHandler` の死にパラメータは signature の嘘であり、refactor ついでに消すのが誠実

## 影響

- `packages/hooks/src/session-start-handler.ts` を factory function に書き換え
- `packages/hooks/src/session-end-handler.ts` を factory function に書き換え
  - `chunking` 死にパラメータを削除
  - private `parseLog` を module-level 関数に移動
- `packages/hooks/src/qa-chunking-strategy.ts` を factory function に書き換え
  - private `extractQAPairs` / `splitChunk` / `splitIntoSentences` を module-level pure 関数に移動
- `packages/hooks/src/index.ts` の re-export を更新
- consumer 更新:
  - `packages/mcp-server/src/session-start.ts` — `defineSessionStartHandler` に置換
  - `packages/mcp-server/src/session-end.ts` — `defineSessionEndHandler(saveUseCase)` に置換（chunking 削除）
  - `packages/mcp-server/src/container.ts` — `defineQAChunkingStrategy()` に置換
- test 更新（hooks の 3 ファイル、19 テスト全て緑）
- `packages/hooks/CLAUDE.md` の「主要クラス」を「主要 factory」テーブルに変更

## 完了宣言

本 ADR 採用をもって、`packages/core/src/errors/memory-error.ts` を除く全ての source code が factory function 規約で統一される。今後 core を import する新 module は factory function で実装すること。`extends Error` 等、継承が本質的機能となるケースのみ class を許容する。
