import type { StorageRepository } from '../interfaces/storage-repository.js'

/** A portable representation of a memory for import/export. */
export interface ExportedMemory {
  /** The text content of the memory. */
  content: string
  /** Metadata associated with the memory. */
  metadata: {
    sessionId: string
    projectPath?: string
    tags?: string[]
    source: 'manual' | 'auto'
  }
  /** ISO 8601 creation timestamp. */
  createdAt: string
}

/** Exports all memories in a portable format (without embeddings). */
export class ExportMemoryUseCase {
  /**
   * Creates a new ExportMemoryUseCase.
   * @param storage - The storage repository to export from.
   */
  constructor(private readonly storage: StorageRepository) {}

  /**
   * Exports all memories as portable objects with ISO date strings.
   * @returns An array of exported memories.
   */
  async execute(): Promise<ExportedMemory[]> {
    const memories = await this.storage.exportAll()
    return memories.map((m) => ({
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
    }))
  }
}
