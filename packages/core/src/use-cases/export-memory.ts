import type { Memory } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

export interface ExportedMemory {
  content: string
  metadata: {
    sessionId: string
    projectPath?: string
    tags?: string[]
    source: 'manual' | 'auto'
  }
  createdAt: string
}

export class ExportMemoryUseCase {
  constructor(private readonly storage: StorageRepository) {}

  async execute(): Promise<ExportedMemory[]> {
    const memories = await this.storage.exportAll()
    return memories.map((m) => ({
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
    }))
  }
}
