# ADR-0009: factory function 規約を infrastructure adapter まで拡張する

## ステータス

採用（ADR-0008 を拡張）

## コンテキスト

[ADR-0008](./0008-use-case-factory-functions.md) で `packages/core/src/use-cases/` の 10 UseCase を class から factory function (`defineXxxUseCase`) に変換した。しかし infrastructure adapter（`OnnxEmbeddingProvider` / `PostgresStorageRepository`）は class のまま残り、コードベース内に 2 種類の規約が混在していた:

- **UseCase**: factory function（`defineXxxUseCase`）
- **Infrastructure adapter**: class（`implements EmbeddingProvider` / `implements StorageRepository`）

この不一致はレビューで検出され、「なぜ adapter だけ class？」という問いが発生した。

## 問題

「`implements interface` だから class」は TypeScript では技術的に正しくない:

- TypeScript の `interface` は **構造的型付け** であり、`implements` キーワードは「コンパイル時に class が interface の shape を満たすか」を検査するだけ
- 同等の保証は factory function の戻り値型注釈で得られる:

```ts
// 完全に等価（どちらも同じコンパイル時検査）
export class OnnxEmbeddingProvider implements EmbeddingProvider { ... }
export function defineOnnxEmbeddingProvider(config): EmbeddingProvider { ... }
```

ADR-0008 の論拠はすべて adapter にも等しく適用される:

1. **継承していない**: `OnnxEmbeddingProvider` / `PostgresStorageRepository` は継承されていない
2. **`final` が無い**: 「継承するな」を構文で表現できない
3. **state は closure で表現可能**: lazy-init extractor / postgres client / drizzle db は closure で同等
4. **`instanceof` を使っていない**: 構造的な「contract 満たすか」しか見ていない

## 決定

### 1. ADR-0008 の方針を infrastructure adapter にも適用する

`core` を import する全 module（UseCase + adapter）で class を factory function に置き換える。

- `OnnxEmbeddingProvider` → `defineOnnxEmbeddingProvider(config): EmbeddingProvider`
- `PostgresStorageRepository` → `definePostgresStorageRepository(connectionString, options): PostgresStorageRepository`

### 2. interface 外メソッドは戻り値型に露出する

`PostgresStorageRepository` は `StorageRepository` 非準拠のライフサイクル管理メソッド（`migrate` / `close`）を持つ。これらは mcp-server の session-start / session-end から直接呼ばれるため、拡張型で公開する:

```ts
export interface PostgresStorageRepository extends StorageRepository {
  migrate(): Promise<void>
  close(): Promise<void>
}

export function definePostgresStorageRepository(
  connectionString: string,
  options?: PostgresStorageOptions,
): PostgresStorageRepository { ... }
```

戻り値型は **interface name と同じ** にするため、consumer 側の型注釈（例: `let repo: PostgresStorageRepository`）は変更不要。value としての class 名が function 名に変わるだけ。

### 3. 例外は据え置き

`packages/core/src/errors/memory-error.ts` の `MemoryError` 系クラスは **継承が本質的機能** として必要なので class のまま維持する。`extends Error` は `instanceof` によるエラー分類の前提であり、factory で代替できない。この例外は ADR-0008 で既に定めた通り。

## 理由

### なぜ全 adapter を factory 化するか

- 規約の一貫性は「境界線が明確」であることで担保される。「core を import する全 module は factory（例外: errors のみ）」は「UseCase は factory だが adapter は class」より説明コストが低い
- 将来さらなる adapter（例: `SqliteStorageRepository`, `OpenAIEmbeddingProvider`）を追加する際の判断コストを消す
- レビューで繰り返し「なぜ adapter だけ class？」を問われる状況を防ぐ

### なぜ interface 名を流用して戻り値型にするか

- consumer 側の型注釈を変更しなくて済む
- 「この factory は XxxRepository を作る」という読み手の理解を壊さない
- class 時代の `implements` 動詞のニュアンスは残す（戻り値型 = 契約）

### なぜ errors だけ例外か

- `class MemoryNotFoundError extends MemoryError extends Error` は **本物の継承** を使っており、`instanceof MemoryNotFoundError` / `instanceof MemoryError` によるエラー分類が前提
- factory function では `instanceof` チェックは動かない（コンストラクタ参照が存在しないため）
- このプロジェクトは core / mcp-server / tools から `instanceof MemoryNotFoundError` 等を実際に使用している

## 影響

- `packages/embedding-onnx/src/onnx-embedding-provider.ts` を factory function に書き換え
- `packages/storage-postgres/src/postgres-storage-repository.ts` を factory function に書き換え
  - interface 名 `PostgresStorageRepository` を戻り値型として export（`extends StorageRepository & { migrate, close }`）
  - private `touchLastAccessed` を closure 内関数に移動
- consumer 更新:
  - `packages/mcp-server/src/container.ts`
  - `packages/mcp-server/src/session-start.ts`
  - `packages/mcp-server/src/session-end.ts`
  - `scripts/download-model.mjs`
- test 更新:
  - `packages/embedding-onnx/tests/onnx-embedding-provider.test.ts`
  - `packages/storage-postgres/tests/postgres-storage-repository.test.ts`
- ADR-0008 の冒頭に本 ADR へのリンクを追記
- storage-postgres の 36 テスト、embedding-onnx のテスト、core の 56 テストが既存のまま緑を維持
