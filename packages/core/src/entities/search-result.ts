import type { Memory } from './memory.js'

/** A memory returned from a search query with its relevance score. */
export interface SearchResult {
  /** The matched memory entry. */
  memory: Memory
  /** Relevance score after RRF fusion and time decay (higher is better). */
  score: number
  /** How the match was found: keyword-only, vector-only, or both. */
  matchType: 'keyword' | 'vector' | 'hybrid'
}

/** Filter criteria applied to search queries. */
export interface SearchFilter {
  /** Restrict results to a specific project path. */
  projectPath?: string
  /** Filter by creation source. */
  source?: 'manual' | 'auto'
  /** Filter by tags. */
  tags?: string[]
}
