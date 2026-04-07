import { randomUUID } from 'node:crypto'
import { DEDUP_DEFAULTS } from '../constants.js'
import type { ConversationLog } from '../entities/conversation.js'
import type { Memory } from '../entities/memory.js'
import type { ChunkingStrategy } from '../interfaces/chunking-strategy.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

interface SaveManualInput {
  content: string
  sessionId: string
  projectPath?: string
  tags?: string[]
  scope?: 'project' | 'global'
}

interface SaveMemoryOptions {
  similarityThreshold?: number
}

/** Result of a save operation indicating whether the memory was persisted. */
export interface SaveResult {
  /** True if the memory was saved; false if it was skipped as a duplicate. */
  saved: boolean
}

/**
 * Saves memories with automatic deduplication.
 * @remarks
 * Deduplication: before saving, the nearest existing memory is retrieved via vector search.
 * If cosine similarity >= 0.95 (configurable), the new memory is considered a duplicate and skipped.
 */
export class SaveMemoryUseCase {
  private readonly similarityThreshold: number

  /**
   * Creates a new SaveMemoryUseCase.
   * @param storage - The storage repository.
   * @param embedding - The embedding provider for vectorizing content.
   * @param chunking - The chunking strategy for splitting conversations.
   * @param options - Optional overrides (e.g. similarity threshold).
   */
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
    private readonly chunking: ChunkingStrategy,
    options?: SaveMemoryOptions,
  ) {
    this.similarityThreshold = options?.similarityThreshold ?? DEDUP_DEFAULTS.similarityThreshold
  }

  /**
   * Saves a manually created memory, skipping if a duplicate exists.
   * @param input - The memory content and metadata.
   * @returns Whether the memory was saved or skipped.
   */
  async saveManual(input: SaveManualInput): Promise<SaveResult> {
    const embeddingVector = await this.embedding.embed(input.content)

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
    }
    await this.storage.save(memory)
    return { saved: true }
  }

  /**
   * Chunks a conversation, deduplicates in parallel, and saves new memories.
   * @param log - The conversation log to process.
   */
  async saveConversation(log: ConversationLog): Promise<void> {
    const chunks = this.chunking.chunk(log)
    if (chunks.length === 0) return

    const contents = chunks.map((c) => c.content)
    const embeddings = await this.embedding.embedBatch(contents)

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
      })
    }

    if (memories.length > 0) {
      await this.storage.saveBatch(memories)
    }
  }

  /** 最近傍1件のコサイン類似度が閾値以上なら重複とみなす */
  private async isDuplicate(embedding: number[]): Promise<boolean> {
    const results = await this.storage.searchByVector(embedding, 1)
    if (results.length === 0 || !results[0]) return false
    return results[0].score >= this.similarityThreshold
  }
}
