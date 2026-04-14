#!/usr/bin/env node
import { defineSearchMemoryUseCase } from '@claude-memory/core'
import { defineOnnxEmbeddingProvider } from '@claude-memory/embedding-onnx'
import { SessionStartHandler } from '@claude-memory/hooks'
import { definePostgresStorageRepository } from '@claude-memory/storage-postgres'

/**
 * セッション開始時に関連メモリを再現するスタンドアロンスクリプトのエントリポイント。
 * @returns 再現コンテキストをstdoutに出力した後に解決するPromise
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  const storage = definePostgresStorageRepository(databaseUrl)
  const embedding = defineOnnxEmbeddingProvider({
    modelName: process.env.EMBEDDING_MODEL ?? 'intfloat/multilingual-e5-small',
  })

  try {
    const searchUseCase = defineSearchMemoryUseCase(storage, embedding)
    const handler = new SessionStartHandler(searchUseCase)
    const projectPath = process.env.PROJECT_PATH || process.cwd()
    const output = await handler.handle(projectPath)
    console.log(output)
  } finally {
    await storage.close()
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
