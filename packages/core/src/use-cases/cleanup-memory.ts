import type { StorageRepository } from '../interfaces/storage-repository.js'

interface CleanupOptions {
  olderThanDays: number
  dryRun?: boolean
}

/** クリーンアップ操作の結果。 */
export interface CleanupResult {
  /** 削除された記憶の件数（ドライランの場合は削除予定件数）。 */
  deletedCount: number
  /** ドライラン（実際の削除なし）かどうか。 */
  dryRun: boolean
}

/** 指定期間内にアクセスされなかった古い記憶を削除する。 */
export class CleanupMemoryUseCase {
  /**
   * 新しい CleanupMemoryUseCase を生成する。
   * @param storage - 操作対象のストレージリポジトリ。
   */
  constructor(private readonly storage: StorageRepository) {}

  /**
   * クリーンアップ操作を実行する。
   * @param options - 経過日数の閾値とドライランフラグを含むクリーンアップ設定。
   * @returns 対象記憶の件数を含むクリーンアップ結果。
   */
  async execute(options: CleanupOptions): Promise<CleanupResult> {
    if (options.dryRun !== false) {
      const count = await this.storage.countOlderThan('lastAccessedAt', options.olderThanDays)
      return { deletedCount: count, dryRun: true }
    }
    const deleted = await this.storage.deleteOlderThan('lastAccessedAt', options.olderThanDays)
    return { deletedCount: deleted, dryRun: false }
  }
}
