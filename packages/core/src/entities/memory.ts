export interface Memory {
  /** UUID v4 */
  id: string
  /** Q&Aペアのテキスト。空文字不可 */
  content: string
  /** ベクトル表現。list取得時はnull（大きなペイロードのため） */
  embedding: number[] | null
  metadata: MemoryMetadata
  createdAt: Date
  updatedAt: Date
  /** 最終アクセス日時。検索結果として返された際に更新される */
  lastAccessedAt: Date
}

/** Metadata associated with a stored memory entry. */
export interface MemoryMetadata {
  /** Session ID that produced this memory. */
  sessionId: string
  /** Filesystem path of the project this memory belongs to. */
  projectPath?: string
  /** User-defined tags for categorization. */
  tags?: string[]
  /** How the memory was created. */
  source: 'manual' | 'auto'
  /** Memory visibility scope. 'project' (default) scoped to projectPath, 'global' shared across all projects */
  scope?: 'project' | 'global'
}

/** Pagination and filter options for listing memories. */
export interface ListOptions {
  /** Number of items to retrieve. Default: 20, max: 100. */
  limit: number
  /** Number of items to skip. Default: 0. */
  offset: number
  /** Filter by creation source. */
  source?: 'manual' | 'auto'
  /** Filter by tags. */
  tags?: string[]
  /** Filter by session ID. */
  sessionId?: string
  /** Field to sort by. */
  sortBy?: 'createdAt' | 'updatedAt'
  /** Sort direction. */
  sortOrder?: 'asc' | 'desc'
}

/** Aggregate statistics about the memory storage. */
export interface StorageStats {
  /** Total number of stored memories. */
  totalMemories: number
  /** Total number of distinct sessions. */
  totalSessions: number
  /** Creation date of the oldest memory, or null if empty. */
  oldestMemory: Date | null
  /** Creation date of the newest memory, or null if empty. */
  newestMemory: Date | null
  /** Average character length of memory content. */
  averageContentLength: number
  /** Total count of manual memories. */
  manualCount: number
  /** Total count of auto memories. */
  autoCount: number
}
