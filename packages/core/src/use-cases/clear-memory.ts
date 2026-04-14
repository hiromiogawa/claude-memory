import type { StorageRepository } from '../interfaces/storage-repository.js'
import { wrapStorageError } from './wrap-error.js'

/**
 * ストレージ内の全記憶を削除するユースケースを生成する。
 * @param storage - 操作対象のストレージリポジトリ。
 */
export function defineClearMemoryUseCase(storage: StorageRepository) {
  return {
    /**
     * 全保存済み記憶を削除するクリア操作を実行する。
     * @returns 全記憶が削除されたときに解決する。
     */
    async execute(): Promise<void> {
      await wrapStorageError(() => storage.clear())
    },
  }
}

export type ClearMemoryUseCase = ReturnType<typeof defineClearMemoryUseCase>
