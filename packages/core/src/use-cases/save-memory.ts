import { randomUUID } from 'node:crypto'
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

export class SaveMemoryUseCase {
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
    private readonly chunking: ChunkingStrategy,
  ) {}

  async saveManual(input: SaveManualInput): Promise<void> {
    const embeddingVector = await this.embedding.embed(input.content)
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
    }
    await this.storage.save(memory)
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

      memories.push({
        id: randomUUID(),
        content: chunks[i]!.content,
        embedding,
        metadata: chunks[i]!.metadata,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (memories.length > 0) {
      await this.storage.saveBatch(memories)
    }
  }
}
