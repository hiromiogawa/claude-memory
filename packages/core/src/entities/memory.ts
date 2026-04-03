export interface Memory {
  /** UUID v4 */
  id: string
  /** Q&Aペアのテキスト。空文字不可 */
  content: string
  /** ベクトル表現 */
  embedding: number[]
  metadata: MemoryMetadata
  createdAt: Date
  updatedAt: Date
}

export interface MemoryMetadata {
  sessionId: string
  projectPath?: string
  tags?: string[]
  source: 'manual' | 'auto'
}

export interface ListOptions {
  /** 取得件数。デフォルト: 20、最大: 100 */
  limit: number
  /** オフセット。デフォルト: 0 */
  offset: number
  source?: 'manual' | 'auto'
  sessionId?: string
  sortBy?: 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface StorageStats {
  totalMemories: number
  totalSessions: number
  oldestMemory: Date | null
  newestMemory: Date | null
  averageContentLength: number
}
