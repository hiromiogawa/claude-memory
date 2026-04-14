import { randomUUID } from 'node:crypto'
import { CAPACITY_DEFAULTS, DEDUP_DEFAULTS } from '../constants.js'
import type { ConversationLog } from '../entities/conversation.js'
import type { Memory } from '../entities/memory.js'
import type { ChunkingStrategy } from '../interfaces/chunking-strategy.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import { wrapEmbeddingError, wrapStorageError } from './wrap-error.js'

export interface SaveManualInput {
  content: string
  sessionId: string
  projectPath?: string
  tags?: string[]
  scope?: 'project' | 'global'
}

export interface SaveMemoryOptions {
  similarityThreshold?: number
  /** 記憶の最大保存件数。超過時はLFUで自動削除。0で無制限。 */
  maxMemories?: number
}

/** 保存操作の結果。記憶が永続化されたかどうかを示す。 */
export interface SaveResult {
  /** 記憶が保存された場合はtrue、重複としてスキップされた場合はfalse。 */
  saved: boolean
}

/**
 * 自動重複排除付きで記憶を保存するユースケースを生成する。
 *
 * 重複排除: 保存前にvector検索で最近傍の既存記憶を取得する。
 * cosine similarityが0.90以上（設定可能）の場合、新規記憶は重複とみなしてスキップする。
 * @param storage - ストレージリポジトリ。
 * @param embedding - コンテンツをvector化するためのembeddingプロバイダー。
 * @param chunking - 会話を分割するためのチャンキングストラテジー。
 * @param options - オプションの上書き設定（例: similarity閾値、容量上限）。
 */
export function defineSaveMemoryUseCase(
  storage: StorageRepository,
  embedding: EmbeddingProvider,
  chunking: ChunkingStrategy,
  options?: SaveMemoryOptions,
) {
  const similarityThreshold = options?.similarityThreshold ?? DEDUP_DEFAULTS.similarityThreshold
  const maxMemories = options?.maxMemories ?? CAPACITY_DEFAULTS.maxMemories

  /** 最近傍1件のコサイン類似度が閾値以上なら重複とみなす */
  const isDuplicate = async (vector: number[]): Promise<boolean> => {
    const results = await wrapStorageError(() => storage.searchByVector(vector, 1))
    if (results.length === 0 || !results[0]) return false
    return results[0].score >= similarityThreshold
  }

  /** 容量上限を超過する場合、アクセス回数が最も少ない記憶から削除する。 */
  const enforceCapacity = async (newCount: number): Promise<void> => {
    if (maxMemories <= 0) return
    const current = await wrapStorageError(() => storage.countAll())
    const excess = current + newCount - maxMemories
    if (excess > 0) {
      await wrapStorageError(() => storage.deleteLeastAccessed(excess))
    }
  }

  return {
    /**
     * 手動作成の記憶を保存する。重複が存在する場合はスキップする。
     * @param input - 記憶のコンテンツとメタデータ。
     * @returns 記憶が保存されたかスキップされたかを示す結果。
     */
    async saveManual(input: SaveManualInput): Promise<SaveResult> {
      const embeddingVector = await wrapEmbeddingError(() => embedding.embed(input.content))

      if (await isDuplicate(embeddingVector)) return { saved: false }

      const now = new Date()
      const memory: Memory = {
        id: randomUUID(),
        content: input.content,
        embedding: embeddingVector,
        metadata: {
          sessionId: input.sessionId,
          projectPath: input.projectPath,
          tags: input.tags,
          source: 'manual',
          scope: input.scope ?? 'project',
        },
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
        accessCount: 0,
      }
      await enforceCapacity(1)
      await wrapStorageError(() => storage.save(memory))
      return { saved: true }
    },

    /**
     * 会話をチャンク化し、並列で重複排除してから新規記憶を保存する。
     * @param log - 処理する会話ログ。
     */
    async saveConversation(log: ConversationLog): Promise<void> {
      const chunks = chunking.chunk(log)
      if (chunks.length === 0) return

      const contents = chunks.map((c) => c.content)
      const embeddings = await wrapEmbeddingError(() => embedding.embedBatch(contents))

      // Filter out failed, wrong-dimension, or non-finite embeddings
      const expectedDim = embedding.getDimension()
      const validChunks: { chunk: (typeof chunks)[0]; vector: number[] }[] = []
      for (let i = 0; i < chunks.length; i++) {
        const vec = embeddings[i]
        if (vec && vec.length === expectedDim && vec.every((v) => Number.isFinite(v))) {
          validChunks.push({ chunk: chunks[i]!, vector: vec })
        }
      }

      if (validChunks.length === 0) return

      // Parallel dedup check — all at once instead of sequential N+1
      const dupResults = await Promise.all(validChunks.map(({ vector }) => isDuplicate(vector)))

      const now = new Date()
      const memories: Memory[] = []
      for (let i = 0; i < validChunks.length; i++) {
        if (dupResults[i]) continue
        const { chunk, vector } = validChunks[i]!
        memories.push({
          id: randomUUID(),
          content: chunk.content,
          embedding: vector,
          metadata: chunk.metadata,
          createdAt: now,
          updatedAt: now,
          lastAccessedAt: now,
          accessCount: 0,
        })
      }

      if (memories.length > 0) {
        await enforceCapacity(memories.length)
        await wrapStorageError(() => storage.saveBatch(memories))
      }
    },
  }
}

export type SaveMemoryUseCase = ReturnType<typeof defineSaveMemoryUseCase>
