import type { ListOptions, Memory } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

const MAX_LIMIT = 100

export class ListMemoriesUseCase {
  constructor(private readonly storage: StorageRepository) {}
  async execute(options: ListOptions): Promise<Memory[]> {
    const sanitized = { ...options, limit: Math.min(options.limit, MAX_LIMIT) }
    return this.storage.list(sanitized)
  }
}
