import type { Chunk, ChunkingStrategy, ConversationLog } from '@claude-memory/core'

const DEFAULT_MAX_CHUNK_CHARS = 1000

interface QAChunkingOptions {
  maxChunkChars?: number
}

export class QAChunkingStrategy implements ChunkingStrategy {
  private readonly maxChunkChars: number

  constructor(options?: QAChunkingOptions) {
    this.maxChunkChars = options?.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS
  }

  chunk(conversation: ConversationLog): Chunk[] {
    const rawChunks = this.extractQAPairs(conversation)
    const result: Chunk[] = []

    for (const chunk of rawChunks) {
      if (chunk.content.length <= this.maxChunkChars) {
        result.push(chunk)
      } else {
        result.push(...this.splitChunk(chunk))
      }
    }

    return result
  }

  private extractQAPairs(conversation: ConversationLog): Chunk[] {
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

  private splitChunk(chunk: Chunk): Chunk[] {
    const text = chunk.content
    const sentences = this.splitIntoSentences(text)
    const result: Chunk[] = []
    let current = ''

    for (const sentence of sentences) {
      if (sentence.length > this.maxChunkChars) {
        // Single sentence exceeds limit — force split by character
        if (current.length > 0) {
          result.push({ content: current.trim(), metadata: chunk.metadata })
          current = ''
        }
        for (let j = 0; j < sentence.length; j += this.maxChunkChars) {
          const slice = sentence.slice(j, j + this.maxChunkChars)
          result.push({ content: slice, metadata: chunk.metadata })
        }
        continue
      }

      const joined = current.length > 0 ? `${current} ${sentence}` : sentence
      if (joined.length > this.maxChunkChars) {
        result.push({ content: current.trim(), metadata: chunk.metadata })
        current = sentence
      } else {
        current = joined
      }
    }

    if (current.trim().length > 0) {
      result.push({ content: current.trim(), metadata: chunk.metadata })
    }

    return result
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence-ending punctuation (Japanese and English)
    // Keep the delimiter attached to the preceding text
    return text.match(/[^。.!！?？\n]+[。.!！?？\n]?/g) ?? [text]
  }
}
