#!/usr/bin/env node
import { defineSaveMemoryUseCase } from '@claude-memory/core'
import { defineOnnxEmbeddingProvider } from '@claude-memory/embedding-onnx'
import { QAChunkingStrategy, SessionEndHandler } from '@claude-memory/hooks'
import { definePostgresStorageRepository } from '@claude-memory/storage-postgres'

interface HookInput {
  session_id: string
  transcript_path: string
  cwd: string
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

/**
 * セッション終了時に会話ログをQ&Aチャンクに変換してメモリとして保存するスタンドアロンスクリプト。
 * Claude Code の SessionEnd フックから stdin 経由で JSON を受け取る。
 * @returns 保存完了後に解決するPromise
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  const raw = await readStdin()
  if (!raw.trim()) {
    console.error('No input received from stdin')
    process.exit(1)
  }

  const input = JSON.parse(raw) as HookInput
  const { session_id: sessionId, transcript_path: transcriptPath, cwd: projectPath } = input

  if (!transcriptPath) {
    console.error('transcript_path is required in hook input')
    process.exit(1)
  }

  const storage = definePostgresStorageRepository(databaseUrl)
  const embedding = defineOnnxEmbeddingProvider({
    modelName: process.env.EMBEDDING_MODEL ?? 'intfloat/multilingual-e5-small',
  })

  try {
    await storage.migrate()
    const chunking = new QAChunkingStrategy()
    const saveUseCase = defineSaveMemoryUseCase(storage, embedding, chunking)
    const handler = new SessionEndHandler(chunking, saveUseCase)
    await handler.handle(transcriptPath, sessionId, projectPath)
  } finally {
    await storage.close()
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
