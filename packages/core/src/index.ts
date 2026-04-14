export { CAPACITY_DEFAULTS, DEDUP_DEFAULTS, SEARCH_DEFAULTS } from './constants.js'
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
export type {
  CleanupMemoryUseCase,
  CleanupOptions,
  CleanupResult,
  ClearMemoryUseCase,
  DeleteMemoryUseCase,
  ExportedMemory,
  ExportMemoryUseCase,
  GetStatsUseCase,
  ImportMemoryUseCase,
  LeastAccessedCleanupOptions,
  ListMemoriesUseCase,
  OlderThanCleanupOptions,
  SaveManualInput,
  SaveMemoryOptions,
  SaveMemoryUseCase,
  SaveResult,
  SearchMemoryUseCase,
  UpdateMemoryInput,
  UpdateMemoryUseCase,
} from './use-cases/index.js'
export {
  defineCleanupMemoryUseCase,
  defineClearMemoryUseCase,
  defineDeleteMemoryUseCase,
  defineExportMemoryUseCase,
  defineGetStatsUseCase,
  defineImportMemoryUseCase,
  defineListMemoriesUseCase,
  defineSaveMemoryUseCase,
  defineSearchMemoryUseCase,
  defineUpdateMemoryUseCase,
} from './use-cases/index.js'
