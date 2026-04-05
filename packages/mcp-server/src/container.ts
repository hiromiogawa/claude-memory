// packages/mcp-server/src/container.ts
import {
  ClearMemoryUseCase,
  DeleteMemoryUseCase,
  GetStatsUseCase,
  ListMemoriesUseCase,
  SaveMemoryUseCase,
  SearchMemoryUseCase,
  UpdateMemoryUseCase,
} from '@claude-memory/core'
import { OnnxEmbeddingProvider } from '@claude-memory/embedding-onnx'
import { QAChunkingStrategy } from '@claude-memory/hooks'
import { PostgresStorageRepository } from '@claude-memory/storage-postgres'
import type { AppConfig } from './config.js'

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
  }
}

export type Container = ReturnType<typeof createContainer>
