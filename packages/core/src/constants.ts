export const SEARCH_DEFAULTS = {
  rrfK: 60,
  decayHalfLifeDays: 30,
  maxResults: 20,
} as const

export const DEDUP_DEFAULTS = {
  /** コサイン類似度の閾値。0.95以上は実質同一内容とみなす */
  similarityThreshold: 0.95,
} as const
