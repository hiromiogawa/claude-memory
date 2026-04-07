import type { StorageRepository } from '../interfaces/storage-repository.js'

interface CleanupOptions {
  olderThanDays: number
  dryRun?: boolean
}

/** Result of a cleanup operation. */
export interface CleanupResult {
  /** Number of memories deleted (or that would be deleted in dry-run mode). */
  deletedCount: number
  /** Whether this was a dry run (no actual deletion). */
  dryRun: boolean
}

/** Removes stale memories that have not been accessed within a given period. */
export class CleanupMemoryUseCase {
  /**
   * Creates a new CleanupMemoryUseCase.
   * @param storage - The storage repository to operate on.
   */
  constructor(private readonly storage: StorageRepository) {}

  /**
   * Executes the cleanup operation.
   * @param options - Cleanup configuration including age threshold and dry-run flag.
   * @returns The cleanup result with the number of affected memories.
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
