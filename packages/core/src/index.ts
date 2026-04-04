export { DEDUP_DEFAULTS, SEARCH_DEFAULTS } from './constants.js'
export type {
  Chunk,
  ConversationLog,
  ConversationMessage,
  ListOptions,
  Memory,
  MemoryMetadata,
  SearchFilter,
  SearchResult,
  StorageStats,
} from './entities/index.js'
export {
  EmbeddingFailedError,
  MemoryError,
  MemoryNotFoundError,
  StorageConnectionError,
} from './errors/index.js'
export type { ChunkingStrategy, EmbeddingProvider, StorageRepository } from './interfaces/index.js'
export type { SaveResult } from './use-cases/index.js'
export {
  ClearMemoryUseCase,
  DeleteMemoryUseCase,
  GetStatsUseCase,
  ListMemoriesUseCase,
  SaveMemoryUseCase,
  SearchMemoryUseCase,
} from './use-cases/index.js'
