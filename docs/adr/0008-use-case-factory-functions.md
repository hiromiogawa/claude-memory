# ADR-0008: UseCase を class ではなく factory function で実装する

## ステータス

採用。[ADR-0009](./0009-infrastructure-adapter-factory-functions.md) で infrastructure adapter まで方針を拡張。

## コンテキスト

`packages/core/src/use-cases/` の 10 個の UseCase は当初 class として実装されていた:

```ts
export class SaveMemoryUseCase {
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
    private readonly chunking: ChunkingStrategy,
    options?: SaveMemoryOptions,
  ) { /* ... */ }

  async saveManual(input: SaveManualInput): Promise<SaveResult> { /* ... */ }
  async saveConversation(log: ConversationLog): Promise<void> { /* ... */ }
  private async isDuplicate(vector: number[]): Promise<boolean> { /* ... */ }
  private async enforceCapacity(newCount: number): Promise<void> { /* ... */ }
}
```

これは Uncle Bob の Clean Architecture 教科書的パターンを TypeScript に直訳したものだが、以下の問題があった:

1. **継承されない class に本質的価値がない**: class の本質的機能は継承とポリモーフィズムだが、10 個の UseCase はいずれも継承されていない。`errors/memory-error.ts` の `extends Error` とは異なり、UseCase を継承する必然性はない。
2. **TypeScript には `final` が無い**: 「このクラスを継承してはいけない」という意図を構文で表現できないため、読み手に「継承されるかも」という認知負荷が発生し続ける。
3. **state を持たない UseCase（`ListMemoriesUseCase`, `DeleteMemoryUseCase`, `GetStatsUseCase`, `ClearMemoryUseCase`, `ExportMemoryUseCase`, `ImportMemoryUseCase`, `UpdateMemoryUseCase`, `SearchMemoryUseCase`）は純粋な関数で等価に書ける**。
4. **state を持つ UseCase（`SaveMemoryUseCase`, `CleanupMemoryUseCase`）も closure で state と private helper を完全に隠蔽できる**。class の `private` と機能的に同等。

## 決定

UseCase は factory function で実装し、`ReturnType<typeof defineXxxUseCase>` で型を公開する。

```ts
export function defineSaveMemoryUseCase(
  storage: StorageRepository,
  embedding: EmbeddingProvider,
  chunking: ChunkingStrategy,
  options?: SaveMemoryOptions,
) {
  const similarityThreshold = options?.similarityThreshold ?? DEDUP_DEFAULTS.similarityThreshold
  const maxMemories = options?.maxMemories ?? CAPACITY_DEFAULTS.maxMemories

  const isDuplicate = async (vector: number[]): Promise<boolean> => { /* ... */ }
  const enforceCapacity = async (newCount: number): Promise<void> => { /* ... */ }

  return {
    async saveManual(input: SaveManualInput): Promise<SaveResult> { /* ... */ },
    async saveConversation(log: ConversationLog): Promise<void> { /* ... */ },
  }
}

export type SaveMemoryUseCase = ReturnType<typeof defineSaveMemoryUseCase>
```

### 命名規約

- 動詞は **`define`** を使う（`create` ではない）
- 理由: UseCase は実体ではなく振る舞いの定義であり、"create" は「インスタンスを作る」文脈に近い
- DI コンテナ側（`createContainer`）は実体を組み立てるので `create` を使い続ける
- 先例: Vue `defineComponent`, Vitest `defineConfig`

### 例外

`errors/memory-error.ts` の `MemoryError`, `MemoryNotFoundError`, `EmbeddingFailedError`, `StorageConnectionError` は class のまま維持する。これらは実際に `Error` を継承しており、`instanceof` チェックでエラーを分類するため、継承が本質的機能として必要。

## 理由

### なぜ `define` か

- Vue 3 の `defineComponent`, Vitest の `defineConfig`, Pinia の `defineStore` など、TS/JS エコシステムで「動作仕様を定義する」意味で広く使われる語彙
- `create` は「モノを生成する」ニュアンスが強く、抽象的な UseCase の定義には合わない
- `createContainer`（DI コンテナの実体組み立て）と明確に役割が区別される

### なぜ class を捨てるか

- 継承しない class は「継承可能である」という誤ったシグナルを送り続ける
- closure は `private` フィールドと完全に等価な隠蔽を提供する（むしろ外から到達する手段がゼロなので class より強い）
- `this` バインディングの罠がない（コールバックで渡しても壊れない）
- 関数は単一のインポート・単一の呼び出しで完結し、心的モデルが軽い

### なぜ factory function か（素の関数ではなく）

- `SaveMemoryUseCase` / `CleanupMemoryUseCase` は複数のメソッド（`saveManual` / `saveConversation`, `execute` の分岐）を持ち、設定 state を共有する必要がある
- 素の関数を複数 export すると state を引数で渡し続けることになり冗長
- factory function + 戻り値オブジェクトで class と同じ利便性を提供しつつ、継承の可能性を構造的に排除する

## 影響

- `packages/core/src/use-cases/*.ts` の 10 ファイルが class から factory function に変更
- `packages/core/src/use-cases/index.ts` と `packages/core/src/index.ts` の re-export を更新
- `packages/mcp-server/src/container.ts` の `new XxxUseCase(...)` を `defineXxxUseCase(...)` に変更
- `packages/mcp-server/src/session-start.ts`, `session-end.ts` 同上
- `packages/core/tests/use-cases/*.test.ts` の 10 ファイルも同じ機械的変換
- 既存の型名（`SaveMemoryUseCase` 等）は `ReturnType<typeof define*>` で維持されるため、消費側の型注釈は変更不要
- `hooks` パッケージは structural interface（`SearchCapable`, `SaveConversationCapable`）で受けているため影響なし
- 全 56 テストが既存のまま緑を維持
