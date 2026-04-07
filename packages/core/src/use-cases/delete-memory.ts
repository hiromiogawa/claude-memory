import { MemoryNotFoundError } from '../errors/memory-error.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

/** Deletes a single memory by ID, throwing if it does not exist. */
export class DeleteMemoryUseCase {
  /**
   * Creates a new DeleteMemoryUseCase.
   * @param storage - The storage repository to operate on.
   */
  constructor(private readonly storage: StorageRepository) {}
  /**
   * Deletes the memory with the given ID.
   * @param id - The UUID of the memory to delete.
   * @throws {MemoryNotFoundError} If no memory with the given ID exists.
   */
  async execute(id: string): Promise<void> {
    const existing = await this.storage.findById(id)
    if (!existing) throw new MemoryNotFoundError(id)
    await this.storage.delete(id)
  }
}
