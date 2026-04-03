import type { Chunk, ChunkingStrategy, ConversationLog } from '@claude-memory/core'

export class QAChunkingStrategy implements ChunkingStrategy {
  chunk(conversation: ConversationLog): Chunk[] {
    const chunks: Chunk[] = []
    const messages = conversation.messages
    let i = 0

    while (i < messages.length) {
      const userParts: string[] = []
      while (i < messages.length && messages[i]!.role === 'user') {
        userParts.push(messages[i]!.content)
        i++
      }

      const assistantParts: string[] = []
      while (i < messages.length && messages[i]!.role === 'assistant') {
        assistantParts.push(messages[i]!.content)
        i++
      }

      if (userParts.length > 0 && assistantParts.length > 0) {
        chunks.push({
          content: `Q: ${userParts.join('\n')}\nA: ${assistantParts.join('\n')}`,
          metadata: {
            sessionId: conversation.sessionId,
            projectPath: conversation.projectPath,
            source: 'auto',
          },
        })
      }
    }
    return chunks
  }
}
