import type { Chunk } from '../entities/chunk.js'
import type { ConversationLog } from '../entities/conversation.js'

export interface ChunkingStrategy {
  chunk(conversation: ConversationLog): Chunk[]
}
