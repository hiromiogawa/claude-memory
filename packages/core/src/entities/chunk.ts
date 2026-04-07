import type { MemoryMetadata } from './memory.js'

/** A text segment extracted from a conversation with associated metadata. */
export interface Chunk {
  /** The text content of the chunk. */
  content: string
  /** Metadata inherited from the source conversation. */
  metadata: MemoryMetadata
}
