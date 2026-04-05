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

  async execute(options: CleanupOptions): Promise<CleanupResult> {
    if (options.dryRun !== false) {
      const count = await this.storage.countOlderThan('lastAccessedAt', options.olderThanDays)
      return { deletedCount: count, dryRun: true }
    }
    const deleted = await this.storage.deleteOlderThan('lastAccessedAt', options.olderThanDays)
    return { deletedCount: deleted, dryRun: false }
  }
}
