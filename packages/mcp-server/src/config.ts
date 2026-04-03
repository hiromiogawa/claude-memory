// packages/mcp-server/src/config.ts
export interface AppConfig {
  databaseUrl: string
  embeddingModel: string
  embeddingDimension: number
  logLevel: string
}

export function loadConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required')

  return {
    databaseUrl,
    embeddingModel: process.env.EMBEDDING_MODEL ?? 'intfloat/multilingual-e5-small',
    embeddingDimension: Number(process.env.EMBEDDING_DIMENSION ?? '384'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  }
}
