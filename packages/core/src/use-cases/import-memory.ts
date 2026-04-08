import { randomUUID } from 'node:crypto'
import type { Memory } from '../entities/memory.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import type { ExportedMemory } from './export-memory.js'
import { wrapEmbeddingError, wrapStorageError } from './wrap-error.js'

/** 以前エクスポートされた記憶をembeddingを再生成してインポートする。 */
export class ImportMemoryUseCase {
  /**
   * 新しい ImportMemoryUseCase を生成する。
   * @param storage - インポート先のストレージリポジトリ。
   * @param embedding - vectorを再生成するためのembeddingプロバイダー。
   */
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  /**
   * embeddingを再生成し、元の作成日時を保持して記憶をインポートする。
   * @param data - インポートするエクスポート済み記憶の配列。
   * @returns インポートに成功した記憶の件数。
   */
  async execute(data: ExportedMemory[]): Promise<{ imported: number }> {
    let imported = 0
    for (const item of data) {
      const embeddingVector = await wrapEmbeddingError(() => this.embedding.embed(item.content))
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
        accessCount: 0,
      }
      await wrapStorageError(() => this.storage.save(memory))
      imported++
    }
    return { imported }
  }
}
