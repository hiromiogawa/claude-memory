// packages/mcp-server/src/container.ts
import {
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
} from '@claude-memory/core'
import { defineOnnxEmbeddingProvider } from '@claude-memory/embedding-onnx'
import { defineQAChunkingStrategy } from '@claude-memory/hooks'
import { definePostgresStorageRepository } from '@claude-memory/storage-postgres'
import type { AppConfig } from './config.js'

/**
 * 全ユースケースとインフラを含むDIコンテナを生成する。
 * @param config - アプリケーション設定
 * @returns storage・embedding・全ユースケースのインスタンスを保持するコンテナ
 */
export function createContainer(config: AppConfig) {
  const storage = definePostgresStorageRepository(config.databaseUrl, {
    maxConnections: config.dbPoolSize,
  })
  const embedding = defineOnnxEmbeddingProvider({ modelName: config.embeddingModel })
  const chunking = defineQAChunkingStrategy()

  return {
    storage,
    embedding,
    chunking,
    saveMemory: defineSaveMemoryUseCase(storage, embedding, chunking),
    searchMemory: defineSearchMemoryUseCase(storage, embedding),
    deleteMemory: defineDeleteMemoryUseCase(storage),
    listMemories: defineListMemoriesUseCase(storage),
    getStats: defineGetStatsUseCase(storage),
    clearMemory: defineClearMemoryUseCase(storage),
    updateMemory: defineUpdateMemoryUseCase(storage, embedding),
    exportMemory: defineExportMemoryUseCase(storage),
    importMemory: defineImportMemoryUseCase(storage, embedding),
    cleanupMemory: defineCleanupMemoryUseCase(storage),
  }
}

/** 全ユースケースとインフラを保持するDIコンテナの型。 */
export type Container = ReturnType<typeof createContainer>
