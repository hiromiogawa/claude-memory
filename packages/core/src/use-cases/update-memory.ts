import { MemoryNotFoundError } from '../errors/memory-error.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import { wrapEmbeddingError, wrapStorageError } from './wrap-error.js'

interface UpdateMemoryInput {
  id: string
  content?: string
  tags?: string[]
}

/** 既存の記憶のコンテンツやタグを更新する。embeddingの再生成はコンテンツ変更時のみ。 */
export class UpdateMemoryUseCase {
  /**
   * 新しい UpdateMemoryUseCase を生成する。
   * @param storage - 操作対象のストレージリポジトリ。
   * @param embedding - 更新されたコンテンツをvector化するためのembeddingプロバイダー。
   */
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  /**
   * 記憶のコンテンツやタグを更新する。コンテンツが変更された場合のみembeddingを再生成する。
   * @param input - 更新するフィールド（idは必須、contentとtagsは任意）。
   * @throws {MemoryNotFoundError} 指定IDの記憶が存在しない場合。
   */
  async execute(input: UpdateMemoryInput): Promise<void> {
    const existing = await wrapStorageError(() => this.storage.findById(input.id))
    if (!existing) throw new MemoryNotFoundError(input.id)

    const contentChanged = input.content !== undefined && input.content !== existing.content
    const newEmbedding = contentChanged
      ? await wrapEmbeddingError(() => this.embedding.embed(input.content!))
      : existing.embedding

    await wrapStorageError(() =>
      this.storage.save({
        ...existing,
        content: input.content ?? existing.content,
        embedding: newEmbedding,
        metadata: {
          ...existing.metadata,
          tags: input.tags ?? existing.metadata.tags,
        },
        updatedAt: new Date(),
      }),
    )
  }
}
