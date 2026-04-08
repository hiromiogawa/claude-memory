import { LIST_DEFAULTS } from '../constants.js'
import type { ListOptions, Memory } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import { wrapStorageError } from './wrap-error.js'

/** ページネーションで記憶を一覧取得する。上限は100件。 */
export class ListMemoriesUseCase {
  /**
   * 新しい ListMemoriesUseCase を生成する。
   * @param storage - クエリ対象のストレージリポジトリ。
   */
  constructor(private readonly storage: StorageRepository) {}
  /**
   * 指定オプションで記憶を一覧取得する。最大件数は100件に制限される。
   * @param options - ページネーションとフィルターのオプション。
   * @returns 条件に一致する記憶の配列。
   */
  async execute(options: ListOptions): Promise<Memory[]> {
    const sanitized = { ...options, limit: Math.min(options.limit, LIST_DEFAULTS.maxLimit) }
    return wrapStorageError(() => this.storage.list(sanitized))
  }
}
