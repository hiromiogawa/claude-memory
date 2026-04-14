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
        content: `${QA_PREFIX_USER}${userParts.join('\n')}${QA_PREFIX_ASSISTANT}${assistantParts.join('\n')}`,
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

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation (Japanese and English)
  // Keep the delimiter attached to the preceding text
  return text.match(SENTENCE_BOUNDARY_REGEX) ?? [text]
}

function splitChunk(chunk: Chunk, maxChunkChars: number): Chunk[] {
  const sentences = splitIntoSentences(chunk.content)
  const result: Chunk[] = []
  let current = ''

  for (const sentence of sentences) {
    if (sentence.length > maxChunkChars) {
      // Single sentence exceeds limit — force split by character
      if (current.length > 0) {
        result.push({ content: current.trim(), metadata: chunk.metadata })
        current = ''
      }
      for (let j = 0; j < sentence.length; j += maxChunkChars) {
        const slice = sentence.slice(j, j + maxChunkChars)
        result.push({ content: slice, metadata: chunk.metadata })
      }
      continue
    }

    const joined = current.length > 0 ? `${current} ${sentence}` : sentence
    if (joined.length > maxChunkChars) {
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
