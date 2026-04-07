// packages/mcp-server/src/container.ts
import {
  CleanupMemoryUseCase,
  ClearMemoryUseCase,
  DeleteMemoryUseCase,
  ExportMemoryUseCase,
  GetStatsUseCase,
  ImportMemoryUseCase,
  ListMemoriesUseCase,
  SaveMemoryUseCase,
  SearchMemoryUseCase,
  UpdateMemoryUseCase,
} from '@claude-memory/core'
import { OnnxEmbeddingProvider } from '@claude-memory/embedding-onnx'
import { QAChunkingStrategy } from '@claude-memory/hooks'
import { PostgresStorageRepository } from '@claude-memory/storage-postgres'
import type { AppConfig } from './config.js'

/**
 * Creates a dependency injection container with all use cases and infrastructure.
 * @param config - Application configuration
 * @returns Container holding storage, embedding, and all use case instances
 */
export function createContainer(config: AppConfig) {
  const storage = new PostgresStorageRepository(config.databaseUrl, {
    maxConnections: config.dbPoolSize,
  })
  const embedding = new OnnxEmbeddingProvider({ modelName: config.embeddingModel })
  const chunking = new QAChunkingStrategy()

  return {
    storage,
    embedding,
    chunking,
    saveMemory: new SaveMemoryUseCase(storage, embedding, chunking),
    searchMemory: new SearchMemoryUseCase(storage, embedding),
    deleteMemory: new DeleteMemoryUseCase(storage),
    listMemories: new ListMemoriesUseCase(storage),
    getStats: new GetStatsUseCase(storage),
    clearMemory: new ClearMemoryUseCase(storage),
    updateMemory: new UpdateMemoryUseCase(storage, embedding),
    exportMemory: new ExportMemoryUseCase(storage),
    importMemory: new ImportMemoryUseCase(storage, embedding),
    cleanupMemory: new CleanupMemoryUseCase(storage),
  }
}

/** Dependency injection container type holding all use cases and infrastructure. */
export type Container = ReturnType<typeof createContainer>
