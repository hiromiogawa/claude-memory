/**
 * ハイブリッド検索アルゴリズムのデフォルトパラメーター。
 *
 * RRF fusion: score = 1 / (k + rank), where k = 60.
 * Time decay: score * 0.5^(days / 30), half-life = 30 days.
 */
export const SEARCH_DEFAULTS = {
  rrfK: 60,
  decayHalfLifeDays: 30,
  maxResults: 20,
} as const

/**
 * 記憶の重複排除に使用するデフォルトパラメーター。
 *
 * 既存エントリとのcosine similarityが0.90以上の記憶は重複とみなしてスキップする。
 */
export const DEDUP_DEFAULTS = {
  /** cosine similarity閾値。0.90以上を重複として扱う。 */
  similarityThreshold: 0.9,
} as const
