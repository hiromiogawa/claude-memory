import type { MemoryMetadata } from './memory.js'

export interface Chunk {
  content: string
  metadata: MemoryMetadata
}
