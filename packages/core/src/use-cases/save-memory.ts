import { randomUUID } from 'node:crypto'
import { DEDUP_DEFAULTS } from '../constants.js'
import type { ConversationLog } from '../entities/conversation.js'
import type { Memory } from '../entities/memory.js'
import type { ChunkingStrategy } from '../interfaces/chunking-strategy.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

interface SaveManualInput {
  content: string
  sessionId: string
  projectPath?: string
  tags?: string[]
  scope?: 'project' | 'global'
}

interface SaveMemoryOptions {
  similarityThreshold?: number
}

/** 保存操作の結果。記憶が永続化されたかどうかを示す。 */
export interface SaveResult {
  /** 記憶が保存された場合はtrue、重複としてスキップされた場合はfalse。 */
  saved: boolean
}

/**
 * 自動重複排除付きで記憶を保存する。
 *
 * 重複排除: 保存前にvector検索で最近傍の既存記憶を取得する。
 * cosine similarityが0.90以上（設定可能）の場合、新規記憶は重複とみなしてスキップする。
 */
export class SaveMemoryUseCase {
  private readonly similarityThreshold: number

  /**
   * 新しい SaveMemoryUseCase を生成する。
   * @param storage - ストレージリポジトリ。
   * @param embedding - コンテンツをvector化するためのembeddingプロバイダー。
   * @param chunking - 会話を分割するためのチャンキングストラテジー。
   * @param options - オプションの上書き設定（例: similarity閾値）。
   */
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
    private readonly chunking: ChunkingStrategy,
    options?: SaveMemoryOptions,
  ) {
    this.similarityThreshold = options?.similarityThreshold ?? DEDUP_DEFAULTS.similarityThreshold
  }

  /**
   * 手動作成の記憶を保存する。重複が存在する場合はスキップする。
   * @param input - 記憶のコンテンツとメタデータ。
   * @returns 記憶が保存されたかスキップされたかを示す結果。
   */
  async saveManual(input: SaveManualInput): Promise<SaveResult> {
    const embeddingVector = await this.embedding.embed(input.content)

    if (await this.isDuplicate(embeddingVector)) return { saved: false }

    const now = new Date()
    const memory: Memory = {
      id: randomUUID(),
      content: input.content,
      embedding: embeddingVector,
      metadata: {
        sessionId: input.sessionId,
        projectPath: input.projectPath,
        tags: input.tags,
        source: 'manual',
        scope: input.scope ?? 'project',
      },
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    }
    await this.storage.save(memory)
    return { saved: true }
  }

  /**
   * 会話をチャンク化し、並列で重複排除してから新規記憶を保存する。
   * @param log - 処理する会話ログ。
   */
  async saveConversation(log: ConversationLog): Promise<void> {
    const chunks = this.chunking.chunk(log)
    if (chunks.length === 0) return

    const contents = chunks.map((c) => c.content)
    const embeddings = await this.embedding.embedBatch(contents)

    // Filter out failed embeddings
    const validChunks: { chunk: (typeof chunks)[0]; embedding: number[] }[] = []
    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i]
      if (embedding && embedding.length > 0) {
        validChunks.push({ chunk: chunks[i]!, embedding })
      }
    }

    if (validChunks.length === 0) return

    // Parallel dedup check — all at once instead of sequential N+1
    const dupResults = await Promise.all(
      validChunks.map(({ embedding }) => this.isDuplicate(embedding)),
    )

    const now = new Date()
    const memories: Memory[] = []
    for (let i = 0; i < validChunks.length; i++) {
      if (dupResults[i]) continue
      const { chunk, embedding } = validChunks[i]!
      memories.push({
        id: randomUUID(),
        content: chunk.content,
        embedding,
        metadata: chunk.metadata,
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
      })
    }

    if (memories.length > 0) {
      await this.storage.saveBatch(memories)
    }
  }

  /** 最近傍1件のコサイン類似度が閾値以上なら重複とみなす */
  private async isDuplicate(embedding: number[]): Promise<boolean> {
    const results = await this.storage.searchByVector(embedding, 1)
    if (results.length === 0 || !results[0]) return false
    return results[0].score >= this.similarityThreshold
  }
}
