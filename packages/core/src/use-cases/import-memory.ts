import { randomUUID } from 'node:crypto'
import type { Memory } from '../entities/memory.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import type { ExportedMemory } from './export-memory.js'

export class ImportMemoryUseCase {
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  /** 各記憶のembeddingを再計算して保存。createdAtはエクスポート時の値を保持 */
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
