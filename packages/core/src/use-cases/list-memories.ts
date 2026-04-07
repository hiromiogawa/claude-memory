import type { ListOptions, Memory } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

const MAX_LIMIT = 100

/** Lists memories with pagination, capping the limit at 100. */
export class ListMemoriesUseCase {
  /**
   * Creates a new ListMemoriesUseCase.
   * @param storage - The storage repository to query.
   */
  constructor(private readonly storage: StorageRepository) {}
  /**
   * Lists memories with the given options, enforcing a maximum limit of 100.
   * @param options - Pagination and filter options.
   * @returns An array of memories matching the criteria.
   */
  async execute(options: ListOptions): Promise<Memory[]> {
    const sanitized = { ...options, limit: Math.min(options.limit, MAX_LIMIT) }
    return this.storage.list(sanitized)
  }
}
