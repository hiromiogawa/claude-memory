import type { Chunk, ChunkingStrategy, ConversationLog } from '@claude-memory/core'
import { DEFAULT_MAX_CHUNK_CHARS } from './constants.js'

const QA_PREFIX_USER = 'Q: '
const QA_PREFIX_ASSISTANT = '\nA: '
/** 文末句読点で分割する正規表現（日本語・英語対応） */
const SENTENCE_BOUNDARY_REGEX = /[^。.!！?？\n]+[。.!！?？\n]?/g

export interface QAChunkingOptions {
  maxChunkChars?: number
}

function extractQAPairs(conversation: ConversationLog): Chunk[] {
  const { messages } = conversation
  const chunks: Chunk[] = []
  const cursor = { i: 0 }

  const consumeRole = (role: 'user' | 'assistant'): string[] => {
    const parts: string[] = []
    while (cursor.i < messages.length && messages[cursor.i]!.role === role) {
      parts.push(messages[cursor.i]!.content)
      cursor.i++
    }
    return parts
  }

  while (cursor.i < messages.length) {
    const beforePair = cursor.i
    const userParts = consumeRole('user')
    const assistantParts = consumeRole('assistant')

    if (userParts.length > 0 && assistantParts.length > 0) {
      chunks.push({
        content: `${QA_PREFIX_USER}${userParts.join('\n')}${QA_PREFIX_ASSISTANT}${assistantParts.join('\n')}`,
        metadata: {
          sessionId: conversation.sessionId,
          projectPath: conversation.projectPath,
          source: 'auto',
        },
      })
    }

    // 進捗が無ければ無限ループ防止のため強制的に 1 進める
    if (cursor.i === beforePair) cursor.i++
  }
  return chunks
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation (Japanese and English)
  // Keep the delimiter attached to the preceding text
  return text.match(SENTENCE_BOUNDARY_REGEX) ?? [text]
}

function sliceByLength(text: string, max: number): string[] {
  return Array.from({ length: Math.ceil(text.length / max) }, (_, i) =>
    text.slice(i * max, (i + 1) * max),
  )
}

function splitChunk(chunk: Chunk, maxChunkChars: number): Chunk[] {
  const sentences = splitIntoSentences(chunk.content)
  const result: Chunk[] = []
  const buffer = { value: '' }

  const flush = () => {
    if (buffer.value.trim().length > 0) {
      result.push({ content: buffer.value.trim(), metadata: chunk.metadata })
      buffer.value = ''
    }
  }

  for (const sentence of sentences) {
    if (sentence.length > maxChunkChars) {
      flush()
      for (const slice of sliceByLength(sentence, maxChunkChars)) {
        result.push({ content: slice, metadata: chunk.metadata })
      }
      continue
    }

    const joined = buffer.value.length > 0 ? `${buffer.value} ${sentence}` : sentence
    if (joined.length > maxChunkChars) {
      flush()
      buffer.value = sentence
    } else {
      buffer.value = joined
    }
  }
  flush()

  return result
}

/**
 * 会話を Q&A ペアのチャンクに分割する ChunkingStrategy を生成する。
 * @param options - チャンク最大文字数のオプション設定
 */
export function defineQAChunkingStrategy(options?: QAChunkingOptions): ChunkingStrategy {
  const maxChunkChars = options?.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS

  return {
    chunk(conversation: ConversationLog): Chunk[] {
      const rawChunks = extractQAPairs(conversation)
      const result: Chunk[] = []

      for (const c of rawChunks) {
        if (c.content.length <= maxChunkChars) {
          result.push(c)
        } else {
          result.push(...splitChunk(c, maxChunkChars))
        }
      }

      return result
    },
  }
}
