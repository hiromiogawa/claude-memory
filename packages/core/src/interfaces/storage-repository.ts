import type { ListOptions, Memory, StorageStats } from '../entities/memory.js'
import type { SearchFilter, SearchResult } from '../entities/search-result.js'

export interface StorageRepository {
  save(memory: Memory): Promise<void>
  saveBatch(memories: Memory[]): Promise<void>
  findById(id: string): Promise<Memory | null>
  searchByKeyword(query: string, limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  searchByVector(embedding: number[], limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  list(options: ListOptions): Promise<Memory[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
  getStats(): Promise<StorageStats>
  exportAll(): Promise<Memory[]>
}
