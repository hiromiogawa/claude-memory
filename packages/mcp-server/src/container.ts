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
 * 全ユースケースとインフラを含むDIコンテナを生成する。
 * @param config - アプリケーション設定
 * @returns storage・embedding・全ユースケースのインスタンスを保持するコンテナ
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

/** 全ユースケースとインフラを保持するDIコンテナの型。 */
export type Container = ReturnType<typeof createContainer>
