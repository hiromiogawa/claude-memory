import { randomUUID } from 'node:crypto'
import type { Memory } from '../entities/memory.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import type { ExportedMemory } from './export-memory.js'

/** Imports previously exported memories, regenerating their embeddings. */
export class ImportMemoryUseCase {
  /**
   * Creates a new ImportMemoryUseCase.
   * @param storage - The storage repository to import into.
   * @param embedding - The embedding provider for regenerating vectors.
   */
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  /**
   * Imports memories by regenerating embeddings and preserving original creation dates.
   * @param data - The exported memories to import.
   * @returns The count of successfully imported memories.
   */
  async execute(data: ExportedMemory[]): Promise<{ imported: number }> {
    let imported = 0
    for (const item of data) {
      const embeddingVector = await this.embedding.embed(item.content)
      const now = new Date()
      const memory: Memory = {
        id: randomUUID(),
        content: item.content,
        embedding: embeddingVector,
        metadata: {
          sessionId: item.metadata.sessionId,
          projectPath: item.metadata.projectPath,
          tags: item.metadata.tags,
          source: item.metadata.source,
        },
        createdAt: new Date(item.createdAt),
        updatedAt: now,
        lastAccessedAt: now,
      }
      await this.storage.save(memory)
      imported++
    }
    return { imported }
  }
}
