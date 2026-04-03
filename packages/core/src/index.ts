export { SEARCH_DEFAULTS } from './constants.js'
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
export { SaveMemoryUseCase } from './use-cases/save-memory.js'
