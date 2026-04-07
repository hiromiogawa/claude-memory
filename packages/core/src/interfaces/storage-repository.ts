import type { ListOptions, Memory, StorageStats } from '../entities/memory.js'
import type { SearchFilter, SearchResult } from '../entities/search-result.js'

/** Persistence layer abstraction for memory CRUD and search operations. */
export interface StorageRepository {
  /**
   * Persists a single memory entry.
   * @param memory - The memory to save.
   */
  save(memory: Memory): Promise<void>
  /**
   * Persists multiple memory entries in a single operation.
   * @param memories - The memories to save.
   */
  saveBatch(memories: Memory[]): Promise<void>
  /**
   * Finds a memory by its unique ID.
   * @param id - The UUID of the memory.
   * @returns The memory if found, or null.
   */
  findById(id: string): Promise<Memory | null>
  /**
   * Searches memories by keyword using full-text search (pg_bigm).
   * @param query - The keyword search query.
   * @param limit - Maximum number of results.
   * @param filter - Optional filter criteria.
   * @returns Matching results sorted by keyword relevance.
   */
  searchByKeyword(query: string, limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  /**
   * Searches memories by vector similarity (pgvector cosine distance).
   * @param embedding - The query embedding vector.
   * @param limit - Maximum number of results.
   * @param filter - Optional filter criteria.
   * @returns Matching results sorted by cosine similarity.
   */
  searchByVector(embedding: number[], limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  /**
   * Lists memories with pagination and filtering.
   * @param options - Pagination and filter options.
   * @returns An array of memories.
   */
  list(options: ListOptions): Promise<Memory[]>
  /**
   * Deletes a memory by its unique ID.
   * @param id - The UUID of the memory to delete.
   */
  delete(id: string): Promise<void>
  /** Deletes all memories from storage. */
  clear(): Promise<void>
  /**
   * Retrieves aggregate statistics about the storage.
   * @returns Storage statistics.
   */
  getStats(): Promise<StorageStats>
  /**
   * Exports all memories including their embeddings.
   * @returns All stored memories.
   */
  exportAll(): Promise<Memory[]>
  /**
   * Deletes memories older than a specified number of days.
   * @param field - The date field to compare against.
   * @param olderThanDays - Age threshold in days.
   * @returns The number of deleted memories.
   */
  deleteOlderThan(field: 'lastAccessedAt' | 'createdAt', olderThanDays: number): Promise<number>
  /**
   * Counts memories older than a specified number of days.
   * @param field - The date field to compare against.
   * @param olderThanDays - Age threshold in days.
   * @returns The count of matching memories.
   */
  countOlderThan(field: 'lastAccessedAt' | 'createdAt', olderThanDays: number): Promise<number>
}
