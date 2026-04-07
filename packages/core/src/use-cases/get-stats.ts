import type { StorageStats } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

/** Retrieves aggregate statistics about the memory storage. */
export class GetStatsUseCase {
  /**
   * Creates a new GetStatsUseCase.
   * @param storage - The storage repository to query.
   */
  constructor(private readonly storage: StorageRepository) {}
  /**
   * Retrieves storage statistics.
   * @returns Aggregate stats including totals, dates, and averages.
   */
  async execute(): Promise<StorageStats> {
    return this.storage.getStats()
  }
}
