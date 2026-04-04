import { MemoryNotFoundError } from '../errors/memory-error.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

interface UpdateMemoryInput {
  id: string
  content?: string
  tags?: string[]
}

export class UpdateMemoryUseCase {
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  async execute(input: UpdateMemoryInput): Promise<void> {
    const existing = await this.storage.findById(input.id)
    if (!existing) throw new MemoryNotFoundError(input.id)

    const contentChanged = input.content !== undefined && input.content !== existing.content
    const newEmbedding = contentChanged
      ? await this.embedding.embed(input.content!)
      : existing.embedding

    await this.storage.save({
      ...existing,
      content: input.content ?? existing.content,
      embedding: newEmbedding,
      metadata: {
        ...existing.metadata,
        tags: input.tags ?? existing.metadata.tags,
      },
      updatedAt: new Date(),
    })
  }
}
