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

/**
 * 記憶の容量管理に使用するデフォルトパラメーター。
 *
 * 記憶件数が上限を超えた場合、アクセス回数が最も少ない記憶から自動削除する（LFU方式）。
 */
export const CAPACITY_DEFAULTS = {
  /** 記憶の最大保存件数。超過時はLFUで自動削除。 */
  maxMemories: 10000,
} as const

/**
 * 一覧取得の最大取得件数。
 */
export const LIST_DEFAULTS = {
  /** list APIが1回で返せる最大件数。 */
  maxLimit: 100,
} as const
