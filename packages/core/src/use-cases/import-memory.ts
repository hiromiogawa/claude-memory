import { randomUUID } from 'node:crypto'
import type { Memory } from '../entities/memory.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import type { ExportedMemory } from './export-memory.js'
import { wrapEmbeddingError, wrapStorageError } from './wrap-error.js'

/**
 * 以前エクスポートされた記憶をembeddingを再生成してインポートするユースケースを生成する。
 * @param storage - インポート先のストレージリポジトリ。
 * @param embedding - vectorを再生成するためのembeddingプロバイダー。
 */
export function defineImportMemoryUseCase(
  storage: StorageRepository,
  embedding: EmbeddingProvider,
) {
  return {
    /**
     * embeddingを再生成し、元の作成日時を保持して記憶をインポートする。
     * @param data - インポートするエクスポート済み記憶の配列。
     * @returns インポートに成功した記憶の件数。
     */
    async execute(data: ExportedMemory[]): Promise<{ imported: number }> {
      // ループ内のいずれかで wrapStorageError / wrapEmbeddingError が throw すれば
      // 関数全体が例外で抜けるため、正常終了時は必ず data.length 件保存されている。
      for (const item of data) {
        const embeddingVector = await wrapEmbeddingError(() => embedding.embed(item.content))
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
        await wrapStorageError(() => storage.save(memory))
      }
      return { imported: data.length }
    },
  }
}

export type ImportMemoryUseCase = ReturnType<typeof defineImportMemoryUseCase>
