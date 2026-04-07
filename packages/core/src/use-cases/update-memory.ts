import { MemoryNotFoundError } from '../errors/memory-error.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

interface UpdateMemoryInput {
  id: string
  content?: string
  tags?: string[]
}

/** Updates an existing memory's content and/or tags, re-embedding only when content changes. */
export class UpdateMemoryUseCase {
  /**
   * Creates a new UpdateMemoryUseCase.
   * @param storage - The storage repository to operate on.
   * @param embedding - The embedding provider for re-vectorizing updated content.
   */
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  /**
   * Updates a memory's content and/or tags; re-generates embedding only if content changed.
   * @param input - The fields to update (id required, content and tags optional).
   * @throws {MemoryNotFoundError} If no memory with the given ID exists.
   */
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
