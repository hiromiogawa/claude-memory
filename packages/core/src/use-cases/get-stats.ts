import type { StorageStats } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import { wrapStorageError } from './wrap-error.js'

/** 記憶ストレージの集計統計情報を取得する。 */
export class GetStatsUseCase {
  /**
   * 新しい GetStatsUseCase を生成する。
   * @param storage - クエリ対象のストレージリポジトリ。
   */
  constructor(private readonly storage: StorageRepository) {}
  /**
   * ストレージ統計情報を取得する。
   * @returns 総数、日時、平均値を含む集計統計情報。
   */
  async execute(): Promise<StorageStats> {
    return wrapStorageError(() => this.storage.getStats())
  }
}
