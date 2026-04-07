import type { ListOptions, Memory, StorageStats } from '../entities/memory.js'
import type { SearchFilter, SearchResult } from '../entities/search-result.js'

/** 記憶のCRUDおよび検索操作の永続化レイヤー抽象。 */
export interface StorageRepository {
  /**
   * 単一の記憶エントリを永続化する。
   * @param memory - 保存する記憶。
   */
  save(memory: Memory): Promise<void>
  /**
   * 複数の記憶エントリを一括で永続化する。
   * @param memories - 保存する記憶の配列。
   */
  saveBatch(memories: Memory[]): Promise<void>
  /**
   * 一意なIDで記憶を検索する。
   * @param id - 記憶のUUID。
   * @returns 見つかった場合は記憶、見つからない場合は null。
   */
  findById(id: string): Promise<Memory | null>
  /**
   * 全文検索（pg_bigm）でキーワードによる記憶の検索を行う。
   * @param query - keyword検索クエリ。
   * @param limit - 最大取得件数。
   * @param filter - オプションのフィルター条件。
   * @returns keyword関連度順にソートされたマッチ結果。
   */
  searchByKeyword(query: string, limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  /**
   * vector類似度（pgvector cosine距離）で記憶を検索する。
   * @param embedding - クエリのembedding vector。
   * @param limit - 最大取得件数。
   * @param filter - オプションのフィルター条件。
   * @returns cosine similarity順にソートされたマッチ結果。
   */
  searchByVector(embedding: number[], limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  /**
   * ページネーションとフィルターを使って記憶の一覧を取得する。
   * @param options - ページネーションとフィルターのオプション。
   * @returns 記憶の配列。
   */
  list(options: ListOptions): Promise<Memory[]>
  /**
   * 一意なIDで記憶を削除する。
   * @param id - 削除する記憶のUUID。
   */
  delete(id: string): Promise<void>
  /** ストレージ内の全記憶を削除する。 */
  clear(): Promise<void>
  /**
   * ストレージの集計統計情報を取得する。
   * @returns ストレージ統計情報。
   */
  getStats(): Promise<StorageStats>
  /**
   * embeddingを含む全記憶をエクスポートする。
   * @returns 保存済みの全記憶。
   */
  exportAll(): Promise<Memory[]>
  /**
   * 指定日数より古い記憶を削除する。
   * @param field - 比較対象の日付フィールド。
   * @param olderThanDays - 日数の閾値。
   * @returns 削除された記憶の件数。
   */
  deleteOlderThan(field: 'lastAccessedAt' | 'createdAt', olderThanDays: number): Promise<number>
  /**
   * 指定日数より古い記憶の件数を取得する。
   * @param field - 比較対象の日付フィールド。
   * @param olderThanDays - 日数の閾値。
   * @returns 条件に一致する記憶の件数。
   */
  countOlderThan(field: 'lastAccessedAt' | 'createdAt', olderThanDays: number): Promise<number>
}
