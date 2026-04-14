import { MemoryNotFoundError } from '../errors/memory-error.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import { wrapStorageError } from './wrap-error.js'

/**
 * IDで単一の記憶を削除するユースケースを生成する。存在しない場合はスローする。
 * @param storage - 操作対象のストレージリポジトリ。
 */
export function defineDeleteMemoryUseCase(storage: StorageRepository) {
  return {
    /**
     * 指定IDの記憶を削除する。
     * @param id - 削除する記憶のUUID。
     * @throws {MemoryNotFoundError} 指定IDの記憶が存在しない場合。
     */
    async execute(id: string): Promise<void> {
      const existing = await wrapStorageError(() => storage.findById(id))
      if (!existing) throw new MemoryNotFoundError(id)
      await wrapStorageError(() => storage.delete(id))
    },
  }
}

export type DeleteMemoryUseCase = ReturnType<typeof defineDeleteMemoryUseCase>
