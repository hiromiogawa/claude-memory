import type { Chunk, ChunkingStrategy, ConversationLog } from '@claude-memory/core'

/** 埋め込みモデル（multilingual-e5-small）の最大入力512トークン ≈ 日本語1000文字 */
const DEFAULT_MAX_CHUNK_CHARS = 1000
const QA_PREFIX_USER = 'Q: '
const QA_PREFIX_ASSISTANT = '\nA: '
/** 文末句読点で分割する正規表現（日本語・英語対応） */
const SENTENCE_BOUNDARY_REGEX = /[^。.!！?？\n]+[。.!！?？\n]?/g

/** 重要度が高いことを示すキーワード（日本語・英語） */
const IMPORTANCE_KEYWORDS = [
  // Design decisions
  '決定',
  '選定',
  '採用',
  '方針',
  '設計',
  'decided',
  'chose',
  'architecture',
  // Bugs
  'バグ',
  'エラー',
  '原因',
  '修正',
  'bug',
  'error',
  'fix',
  'cause',
  // User preferences
  '好み',
  'スタイル',
  'ルール',
  'prefer',
  'style',
  'rule',
  // Important outcomes
  '結論',
  '合意',
  '理由',
  'conclusion',
  'agreed',
  'reason',
  'because',
  // Technical
  '実装',
  'リファクタ',
  'テスト',
  'implement',
  'refactor',
  'test',
]

/** チャンクの最小文字数。これ以下は重要度が低いと判定 */
const MIN_CHUNK_CHARS = 50

/** チャンクが保存に値する重要度を持つか判定する */
function isImportant(content: string): boolean {
  if (content.length < MIN_CHUNK_CHARS) return false
  const lower = content.toLowerCase()
  return IMPORTANCE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))
}

interface QAChunkingOptions {
  maxChunkChars?: number
  /** 重要度フィルタを有効にするか（デフォルト: true） */
  filterByImportance?: boolean
}

/** Splits conversations into Q&A pair chunks with optional importance filtering. */
export class QAChunkingStrategy implements ChunkingStrategy {
  private readonly maxChunkChars: number
  private readonly filterByImportance: boolean

  /**
   * Creates a new QAChunkingStrategy instance.
   * @param options - Optional configuration for max chunk size and importance filtering
   */
  constructor(options?: QAChunkingOptions) {
    this.maxChunkChars = options?.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS
    this.filterByImportance = options?.filterByImportance ?? true
  }

  /**
   * Chunks a conversation log into Q&A pairs, splitting oversized chunks and filtering by importance.
   * @param conversation - The conversation log to chunk
   * @returns Array of chunks suitable for embedding and storage
   */
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

    // Filter out low-importance chunks (only when enabled, e.g. auto-save)
    return this.filterByImportance ? result.filter((chunk) => isImportant(chunk.content)) : result
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
    return text.match(SENTENCE_BOUNDARY_REGEX) ?? [text]
  }
}
