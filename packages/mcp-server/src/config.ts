// packages/mcp-server/src/config.ts
/** Application configuration loaded from environment variables. */
export interface AppConfig {
  databaseUrl: string
  dbPoolSize: number
  embeddingModel: string
  embeddingDimension: number
  logLevel: string
}

/**
 * Loads application configuration from environment variables.
 * @returns The resolved application configuration
 */
export function loadConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required')

  return {
    databaseUrl,
    dbPoolSize: Number(process.env.DB_POOL_SIZE ?? '10'),
    embeddingModel: process.env.EMBEDDING_MODEL ?? 'intfloat/multilingual-e5-small',
    embeddingDimension: Number(process.env.EMBEDDING_DIMENSION ?? '384'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  }
}
