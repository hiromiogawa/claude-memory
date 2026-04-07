import { SEARCH_DEFAULTS } from '../constants.js'
import type { SearchFilter, SearchResult } from '../entities/search-result.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

/**
 * RRF fusionと時間減衰を使ったハイブリッドkeyword + vector検索で記憶を検索する。
 *
 * パイプライン: 並列keyword（pg_bigm）+ vector（pgvector）検索、その後Reciprocal Rank Fusion。
 * RRF formula: score = 1 / (k + rank), where k = 60.
 * Time decay: decayedScore = rrfScore * 0.5^(daysSinceCreation / 30), half-life = 30 days.
 * Access boost: finalScore = decayedScore * (1 + min(accessCount / 50, 0.2)), max 1.2x at 50 accesses.
 * keywordとvectorの両方のリストに現れた結果はRRFスコアが加算される（"hybrid"マッチ）。
 * @example
 * ```ts
 * const results = await searchUseCase.search('database migration', 10, { tags: ['infra'] });
 * ```
 */
export class SearchMemoryUseCase {
  /**
   * 新しい SearchMemoryUseCase を生成する。
   * @param storage - keywordとvector検索用のストレージリポジトリ。
   * @param embedding - クエリをvector化するためのembeddingプロバイダー。
   */
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  /**
   * keywordとvectorの結果を組み合わせたハイブリッド検索を実行する。
   * @param query - 検索クエリのテキスト。
   * @param limit - 最大取得件数（デフォルト: 20）。
   * @param filter - オプションのフィルター条件。
   * @returns RRF fusionと時間減衰後にランク付けされた検索結果。
   */
  async search(
    query: string,
    limit: number = SEARCH_DEFAULTS.maxResults,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embedding.embed(query)
    const [keywordResults, vectorResults] = await Promise.all([
      this.storage.searchByKeyword(query, limit, filter),
      this.storage.searchByVector(queryEmbedding, limit, filter),
    ])
    return this.mergeWithRRF(keywordResults, vectorResults, limit)
  }

  private mergeWithRRF(
    keywordResults: SearchResult[],
    vectorResults: SearchResult[],
    limit: number,
  ): SearchResult[] {
    const k = SEARCH_DEFAULTS.rrfK
    const scoreMap = new Map<
      string,
      { score: number; result: SearchResult; sources: Set<string> }
    >()

    for (let i = 0; i < keywordResults.length; i++) {
      const r = keywordResults[i]!
      const rrfScore = 1 / (k + i + 1)
      scoreMap.set(r.memory.id, { score: rrfScore, result: r, sources: new Set(['keyword']) })
    }

    for (let i = 0; i < vectorResults.length; i++) {
      const r = vectorResults[i]!
      const rrfScore = 1 / (k + i + 1)
      const existing = scoreMap.get(r.memory.id)
      if (existing) {
        existing.score += rrfScore
        existing.sources.add('vector')
      } else {
        scoreMap.set(r.memory.id, { score: rrfScore, result: r, sources: new Set(['vector']) })
      }
    }

    const now = new Date()
    const results: SearchResult[] = []
    for (const entry of scoreMap.values()) {
      const decayedScore = entry.score * this.timeDecay(entry.result.memory.createdAt, now)
      const boostedScore = decayedScore * this.accessBoost(entry.result.memory.accessCount)
      const matchType: SearchResult['matchType'] =
        entry.sources.size > 1 ? 'hybrid' : entry.sources.has('keyword') ? 'keyword' : 'vector'
      results.push({ memory: entry.result.memory, score: boostedScore, matchType })
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  /**
   * アクセス頻度に基づくスコアブースト倍率を計算する。
   * @param accessCount - 累計アクセス回数。
   * @returns 1.0〜1.2のブースト倍率。50回アクセスで上限1.2倍。
   */
  private accessBoost(accessCount: number): number {
    const ACCESS_BOOST_DIVISOR = 50
    const MAX_BOOST = 0.2
    return 1 + Math.min(accessCount / ACCESS_BOOST_DIVISOR, MAX_BOOST)
  }

  private timeDecay(createdAt: Date, now: Date): number {
    const MS_PER_DAY = 86_400_000
    const HALF_LIFE_BASE = 0.5
    const daysDiff = (now.getTime() - createdAt.getTime()) / MS_PER_DAY
    const halfLife = SEARCH_DEFAULTS.decayHalfLifeDays
    return HALF_LIFE_BASE ** (daysDiff / halfLife)
  }
}
