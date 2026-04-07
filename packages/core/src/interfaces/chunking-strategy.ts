import type { Chunk } from '../entities/chunk.js'
import type { ConversationLog } from '../entities/conversation.js'

/** Strategy for splitting a conversation into storable chunks. */
export interface ChunkingStrategy {
  /**
   * Splits a conversation into discrete chunks for storage.
   * @param conversation - The conversation log to chunk.
   * @returns An array of chunks extracted from the conversation.
   */
  chunk(conversation: ConversationLog): Chunk[]
}
