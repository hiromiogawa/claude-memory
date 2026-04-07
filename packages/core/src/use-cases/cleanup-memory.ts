import type { StorageRepository } from '../interfaces/storage-repository.js'

/** 従来の日数ベースクリーンアップ（olderThanDays必須、後方互換）。 */
interface OlderThanCleanupOptions {
  strategy?: 'lastAccessedOlderThan'
  olderThanDays: number
  dryRun?: boolean
}

/** LFU（アクセス回数最少）ベースのクリーンアップ。 */
interface LeastAccessedCleanupOptions {
  strategy: 'leastAccessed'
  limit: number
  dryRun?: boolean
}

type CleanupOptions = OlderThanCleanupOptions | LeastAccessedCleanupOptions

/** クリーンアップ操作の結果。 */
export interface CleanupResult {
  /** 削除された記憶の件数（ドライランの場合は削除予定件数）。 */
  deletedCount: number
  /** ドライラン（実際の削除なし）かどうか。 */
  dryRun: boolean
}

/** 古い記憶やアクセス頻度の低い記憶を削除する。 */
export class CleanupMemoryUseCase {
  /**
   * 新しい CleanupMemoryUseCase を生成する。
   * @param storage - 操作対象のストレージリポジトリ。
   */
  constructor(private readonly storage: StorageRepository) {}

  /**
   * クリーンアップ操作を実行する。
   *
   * strategy未指定またはlastAccessedOlderThanの場合は日数ベース削除、
   * leastAccessedの場合はアクセス回数が少ない順にN件削除する。
   * @param options - クリーンアップ設定。
   * @returns 対象記憶の件数を含むクリーンアップ結果。
   */
  async execute(options: CleanupOptions): Promise<CleanupResult> {
    if (options.strategy === 'leastAccessed') {
      return this.executeLeastAccessed(options)
    }
    return this.executeOlderThan(options)
  }

  private async executeOlderThan(options: OlderThanCleanupOptions): Promise<CleanupResult> {
    if (options.dryRun !== false) {
      const count = await this.storage.countOlderThan('lastAccessedAt', options.olderThanDays)
      return { deletedCount: count, dryRun: true }
    }
    const deleted = await this.storage.deleteOlderThan('lastAccessedAt', options.olderThanDays)
    return { deletedCount: deleted, dryRun: false }
  }

  private async executeLeastAccessed(options: LeastAccessedCleanupOptions): Promise<CleanupResult> {
    if (options.dryRun !== false) {
      const total = await this.storage.countAll()
      return { deletedCount: Math.min(options.limit, total), dryRun: true }
    }
    const deleted = await this.storage.deleteLeastAccessed(options.limit)
    return { deletedCount: deleted, dryRun: false }
  }
}
