import type { StorageStats } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

export class GetStatsUseCase {
  constructor(private readonly storage: StorageRepository) {}
  async execute(): Promise<StorageStats> {
    return this.storage.getStats()
  }
}
