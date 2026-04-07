/**
 * Default parameters for the hybrid search algorithm.
 * @remarks
 * RRF fusion: score = 1 / (k + rank), where k = 60.
 * Time decay: score * 0.5^(days / 30), half-life = 30 days.
 */
export const SEARCH_DEFAULTS = {
  rrfK: 60,
  decayHalfLifeDays: 30,
  maxResults: 20,
} as const

/**
 * Default parameters for memory deduplication.
 * @remarks
 * Memories with cosine similarity >= 0.95 to an existing entry are considered duplicates and skipped.
 */
export const DEDUP_DEFAULTS = {
  /** Cosine similarity threshold; values >= 0.95 are treated as duplicates. */
  similarityThreshold: 0.95,
} as const
