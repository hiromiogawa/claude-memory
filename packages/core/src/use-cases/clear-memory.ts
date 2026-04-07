import type { StorageRepository } from '../interfaces/storage-repository.js'

/** Deletes all memories from storage. */
export class ClearMemoryUseCase {
  /**
   * Creates a new ClearMemoryUseCase.
   * @param storage - The storage repository to operate on.
   */
  constructor(private readonly storage: StorageRepository) {}
  /**
   * Executes the clear operation, removing all stored memories.
   * @returns Resolves when all memories have been deleted.
   */
  async execute(): Promise<void> {
    await this.storage.clear()
  }
}
