import { MemoryNotFoundError } from '../errors/memory-error.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

export class DeleteMemoryUseCase {
  constructor(private readonly storage: StorageRepository) {}
  async execute(id: string): Promise<void> {
    const existing = await this.storage.findById(id)
    if (!existing) throw new MemoryNotFoundError(id)
    await this.storage.delete(id)
  }
}
