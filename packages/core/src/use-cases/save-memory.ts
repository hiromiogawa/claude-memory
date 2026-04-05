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
}

interface SaveMemoryOptions {
  similarityThreshold?: number
}

export interface SaveResult {
  saved: boolean
}

export class SaveMemoryUseCase {
  private readonly similarityThreshold: number

  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
    private readonly chunking: ChunkingStrategy,
    options?: SaveMemoryOptions,
  ) {
    this.similarityThreshold = options?.similarityThreshold ?? DEDUP_DEFAULTS.similarityThreshold
  }

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
      },
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    }
    await this.storage.save(memory)
    return { saved: true }
  }

  async saveConversation(log: ConversationLog): Promise<void> {
    const chunks = this.chunking.chunk(log)
    if (chunks.length === 0) return

    const contents = chunks.map((c) => c.content)
    const embeddings = await this.embedding.embedBatch(contents)

    const now = new Date()
    const memories: Memory[] = []

    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i]
      if (!embedding || embedding.length === 0) continue

      if (await this.isDuplicate(embedding)) continue

      memories.push({
        id: randomUUID(),
        content: chunks[i]!.content,
        embedding,
        metadata: chunks[i]!.metadata,
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
