import { randomUUID } from 'node:crypto'
import { CAPACITY_DEFAULTS, DEDUP_DEFAULTS } from '../constants.js'
import type { ConversationLog } from '../entities/conversation.js'
import type { Memory } from '../entities/memory.js'
import type { ChunkingStrategy } from '../interfaces/chunking-strategy.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import { wrapEmbeddingError, wrapStorageError } from './wrap-error.js'

interface SaveManualInput {
  content: string
  sessionId: string
  projectPath?: string
  tags?: string[]
  scope?: 'project' | 'global'
}

interface SaveMemoryOptions {
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
 * 自動重複排除付きで記憶を保存する。
 *
 * 重複排除: 保存前にvector検索で最近傍の既存記憶を取得する。
 * cosine similarityが0.90以上（設定可能）の場合、新規記憶は重複とみなしてスキップする。
 */
export class SaveMemoryUseCase {
  private readonly similarityThreshold: number
  private readonly maxMemories: number

  /**
   * 新しい SaveMemoryUseCase を生成する。
   * @param storage - ストレージリポジトリ。
   * @param embedding - コンテンツをvector化するためのembeddingプロバイダー。
   * @param chunking - 会話を分割するためのチャンキングストラテジー。
   * @param options - オプションの上書き設定（例: similarity閾値、容量上限）。
   */
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
    private readonly chunking: ChunkingStrategy,
    options?: SaveMemoryOptions,
  ) {
    this.similarityThreshold = options?.similarityThreshold ?? DEDUP_DEFAULTS.similarityThreshold
    this.maxMemories = options?.maxMemories ?? CAPACITY_DEFAULTS.maxMemories
  }

  /**
   * 手動作成の記憶を保存する。重複が存在する場合はスキップする。
   * @param input - 記憶のコンテンツとメタデータ。
   * @returns 記憶が保存されたかスキップされたかを示す結果。
   */
  async saveManual(input: SaveManualInput): Promise<SaveResult> {
    const embeddingVector = await wrapEmbeddingError(() => this.embedding.embed(input.content))

    if (await this.isDuplicate(embeddingVector)) return { saved: false }

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
    await this.enforceCapacity(1)
    await wrapStorageError(() => this.storage.save(memory))
    return { saved: true }
  }

  /**
   * 会話をチャンク化し、並列で重複排除してから新規記憶を保存する。
   * @param log - 処理する会話ログ。
   */
  async saveConversation(log: ConversationLog): Promise<void> {
    const chunks = this.chunking.chunk(log)
    if (chunks.length === 0) return

    const contents = chunks.map((c) => c.content)
    const embeddings = await wrapEmbeddingError(() => this.embedding.embedBatch(contents))

    // Filter out failed embeddings
    const validChunks: { chunk: (typeof chunks)[0]; embedding: number[] }[] = []
    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i]
      if (embedding && embedding.length > 0) {
        validChunks.push({ chunk: chunks[i]!, embedding })
      }
    }

    if (validChunks.length === 0) return

    // Parallel dedup check — all at once instead of sequential N+1
    const dupResults = await Promise.all(
      validChunks.map(({ embedding }) => this.isDuplicate(embedding)),
    )

    const now = new Date()
    const memories: Memory[] = []
    for (let i = 0; i < validChunks.length; i++) {
      if (dupResults[i]) continue
      const { chunk, embedding } = validChunks[i]!
      memories.push({
        id: randomUUID(),
        content: chunk.content,
        embedding,
        metadata: chunk.metadata,
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
        accessCount: 0,
      })
    }

    if (memories.length > 0) {
      await this.enforceCapacity(memories.length)
      await wrapStorageError(() => this.storage.saveBatch(memories))
    }
  }

  /**
   * 容量上限を超過する場合、アクセス回数が最も少ない記憶から削除する。
   * @param newCount - これから追加する記憶の件数。
   */
  private async enforceCapacity(newCount: number): Promise<void> {
    if (this.maxMemories <= 0) return
    const current = await wrapStorageError(() => this.storage.countAll())
    const excess = current + newCount - this.maxMemories
    if (excess > 0) {
      await wrapStorageError(() => this.storage.deleteLeastAccessed(excess))
    }
  }

  /** 最近傍1件のコサイン類似度が閾値以上なら重複とみなす */
  private async isDuplicate(embedding: number[]): Promise<boolean> {
    const results = await wrapStorageError(() => this.storage.searchByVector(embedding, 1))
    if (results.length === 0 || !results[0]) return false
    return results[0].score >= this.similarityThreshold
  }
}
