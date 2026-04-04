import type {
  ListOptions,
  Memory,
  SearchFilter,
  SearchResult,
  StorageRepository,
  StorageStats,
} from '@claude-memory/core'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { memories } from './schema.js'

type DbRow = typeof memories.$inferSelect

function toMemory(row: DbRow): Memory {
  return {
    id: row.id,
    content: row.content,
    embedding: null, // embeddings not fetched by default (large payload)
    metadata: {
      sessionId: row.sessionId ?? '',
      projectPath: row.projectPath ?? undefined,
      tags: row.tags ?? undefined,
      source: (row.source as 'manual' | 'auto') ?? 'manual',
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toMemoryWithEmbedding(row: DbRow & { embedding: number[] }): Memory {
  return {
    id: row.id,
    content: row.content,
    embedding: row.embedding,
    metadata: {
      sessionId: row.sessionId ?? '',
      projectPath: row.projectPath ?? undefined,
      tags: row.tags ?? undefined,
      source: (row.source as 'manual' | 'auto') ?? 'manual',
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class PostgresStorageRepository implements StorageRepository {
  private readonly client: ReturnType<typeof postgres>
  private readonly db: ReturnType<typeof drizzle>

  constructor(connectionString: string) {
    this.client = postgres(connectionString)
    this.db = drizzle(this.client)
  }

  async close(): Promise<void> {
    await this.client.end()
  }

  async save(memory: Memory): Promise<void> {
    if (!memory.embedding) throw new Error('Cannot save memory without embedding')
    const embeddingLiteral = `[${memory.embedding.join(',')}]`

    await this.db
      .insert(memories)
      .values({
        id: memory.id,
        content: memory.content,
        embedding: sql`${embeddingLiteral}::vector`,
        sessionId: memory.metadata.sessionId,
        projectPath: memory.metadata.projectPath ?? null,
        tags: memory.metadata.tags ?? null,
        source: memory.metadata.source,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
      })
      .onConflictDoUpdate({
        target: memories.id,
        set: {
          content: memory.content,
          embedding: sql`${embeddingLiteral}::vector`,
          sessionId: memory.metadata.sessionId,
          projectPath: memory.metadata.projectPath ?? null,
          tags: memory.metadata.tags ?? null,
          source: memory.metadata.source,
          updatedAt: memory.updatedAt,
        },
      })
  }

  async saveBatch(batch: Memory[]): Promise<void> {
    if (batch.length === 0) return
    for (const memory of batch) {
      await this.save(memory)
    }
  }

  async findById(id: string): Promise<Memory | null> {
    const rows = await this.db.select().from(memories).where(eq(memories.id, id)).limit(1)
    if (rows.length === 0 || !rows[0]) return null
    return toMemory(rows[0])
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(memories).where(eq(memories.id, id))
  }

  async clear(): Promise<void> {
    await this.db.delete(memories)
  }

  async list(options: ListOptions): Promise<Memory[]> {
    const {
      limit,
      offset,
      source,
      tags,
      sessionId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options

    const conditions = []
    if (source) conditions.push(eq(memories.source, source))
    if (sessionId) conditions.push(eq(memories.sessionId, sessionId))
    if (tags && tags.length > 0) {
      conditions.push(
        sql`${memories.tags} && ${sql.raw(`ARRAY[${tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`)}`,
      )
    }

    const orderCol = sortBy === 'updatedAt' ? memories.updatedAt : memories.createdAt
    const orderDir = sortOrder === 'asc' ? asc(orderCol) : desc(orderCol)

    const rows = await this.db
      .select()
      .from(memories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderDir)
      .limit(limit)
      .offset(offset)

    return rows.map(toMemory)
  }

  async searchByKeyword(
    query: string,
    limit: number,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    // LIKE filters rows containing the query; bigm_similarity scores relevance
    const escapedQuery = query.replace(/[%_\\]/g, '\\$&')
    const conditions = [sql`${memories.content} LIKE ${'%' + escapedQuery + '%'}`]

    if (filter?.projectPath) {
      conditions.push(eq(memories.projectPath, filter.projectPath))
    }
    if (filter?.source) {
      conditions.push(eq(memories.source, filter.source))
    }
    if (filter?.tags && filter.tags.length > 0) {
      conditions.push(
        sql`${memories.tags} && ${sql.raw(`ARRAY[${filter.tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`)}`,
      )
    }

    const similarityExpr = sql<number>`bigm_similarity(${memories.content}, ${query}::text)`

    const rows = await this.db
      .select({
        id: memories.id,
        content: memories.content,
        embedding: memories.embedding,
        sessionId: memories.sessionId,
        projectPath: memories.projectPath,
        tags: memories.tags,
        source: memories.source,
        createdAt: memories.createdAt,
        updatedAt: memories.updatedAt,
        similarity: similarityExpr,
      })
      .from(memories)
      .where(and(...conditions))
      .orderBy(sql`${similarityExpr} DESC`)
      .limit(limit)

    return rows.map((row) => ({
      memory: toMemory(row as DbRow),
      score: row.similarity ?? 0,
      matchType: 'keyword' as const,
    }))
  }

  async searchByVector(
    embedding: number[],
    limit: number,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    const embeddingLiteral = `[${embedding.join(',')}]`

    const conditions = []
    if (filter?.projectPath) {
      conditions.push(eq(memories.projectPath, filter.projectPath))
    }
    if (filter?.source) {
      conditions.push(eq(memories.source, filter.source))
    }
    if (filter?.tags && filter.tags.length > 0) {
      conditions.push(
        sql`${memories.tags} && ${sql.raw(`ARRAY[${filter.tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`)}`,
      )
    }

    const distanceExpr = sql<number>`${memories.embedding} <=> ${sql.raw(`'${embeddingLiteral}'`)}::vector`

    const rows = await this.db
      .select({
        id: memories.id,
        content: memories.content,
        embedding: memories.embedding,
        sessionId: memories.sessionId,
        projectPath: memories.projectPath,
        tags: memories.tags,
        source: memories.source,
        createdAt: memories.createdAt,
        updatedAt: memories.updatedAt,
        distance: distanceExpr,
      })
      .from(memories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(distanceExpr)
      .limit(limit)

    return rows.map((row) => ({
      memory: toMemoryWithEmbedding(row as DbRow & { embedding: number[] }),
      score: 1 - (row.distance ?? 0),
      matchType: 'vector' as const,
    }))
  }

  async getStats(): Promise<StorageStats> {
    const result = await this.db
      .select({
        totalMemories: sql<number>`COUNT(*)::int`,
        totalSessions: sql<number>`COUNT(DISTINCT ${memories.sessionId})::int`,
        averageContentLength: sql<number>`COALESCE(AVG(LENGTH(${memories.content})), 0)::float`,
        oldestMemory: sql<Date | null>`MIN(${memories.createdAt})`,
        newestMemory: sql<Date | null>`MAX(${memories.createdAt})`,
      })
      .from(memories)

    const row = result[0]
    if (!row) {
      return {
        totalMemories: 0,
        totalSessions: 0,
        averageContentLength: 0,
        oldestMemory: null,
        newestMemory: null,
      }
    }
    return {
      totalMemories: row.totalMemories,
      totalSessions: row.totalSessions,
      averageContentLength: row.averageContentLength,
      oldestMemory: row.oldestMemory ? new Date(row.oldestMemory) : null,
      newestMemory: row.newestMemory ? new Date(row.newestMemory) : null,
    }
  }
}
