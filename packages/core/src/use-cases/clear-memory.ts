import type { StorageRepository } from '../interfaces/storage-repository.js'

export class ClearMemoryUseCase {
  constructor(private readonly storage: StorageRepository) {}
  async execute(): Promise<void> {
    await this.storage.clear()
  }
}
