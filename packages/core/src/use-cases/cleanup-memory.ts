import type { StorageRepository } from '../interfaces/storage-repository.js'

interface CleanupOptions {
  olderThanDays: number
  dryRun?: boolean
}

export interface CleanupResult {
  deletedCount: number
  dryRun: boolean
}

export class CleanupMemoryUseCase {
  constructor(private readonly storage: StorageRepository) {}

  /** dryRun未指定または true の場合はカウントのみ返す（削除しない）。dryRun=false で実削除 */
  async execute(options: CleanupOptions): Promise<CleanupResult> {
    if (options.dryRun !== false) {
      const count = await this.storage.countOlderThan('lastAccessedAt', options.olderThanDays)
      return { deletedCount: count, dryRun: true }
    }
    const deleted = await this.storage.deleteOlderThan('lastAccessedAt', options.olderThanDays)
    return { deletedCount: deleted, dryRun: false }
  }
}
