import { MemoryNotFoundError } from '../errors/memory-error.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import { wrapStorageError } from './wrap-error.js'

/** IDで単一の記憶を削除する。存在しない場合はスローする。 */
export class DeleteMemoryUseCase {
  /**
   * 新しい DeleteMemoryUseCase を生成する。
   * @param storage - 操作対象のストレージリポジトリ。
   */
  constructor(private readonly storage: StorageRepository) {}
  /**
   * 指定IDの記憶を削除する。
   * @param id - 削除する記憶のUUID。
   * @throws {MemoryNotFoundError} 指定IDの記憶が存在しない場合。
   */
  async execute(id: string): Promise<void> {
    const existing = await wrapStorageError(() => this.storage.findById(id))
    if (!existing) throw new MemoryNotFoundError(id)
    await wrapStorageError(() => this.storage.delete(id))
  }
}
