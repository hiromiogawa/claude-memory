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

/** PostgreSQL配列オーバーラップ演算子(&&)で、いずれかのタグを含む行にフィルタ */
function tagsOverlapCondition(tags: string[]) {
  return sql`${memories.tags} && ARRAY[${sql.join(
    tags.map((t) => sql`${t}`),
    sql`, `,
  )}]::text[]`
}

function toMemory(row: DbRow, embedding: number[] | null = null): Memory {
  return {
    id: row.id,
    content: row.content,
    embedding,
    metadata: {
      sessionId: row.sessionId ?? '',
      projectPath: row.projectPath ?? undefined,
      tags: row.tags ?? undefined,
      source: (row.source as 'manual' | 'auto') ?? 'manual',
      scope: (row.scope as 'project' | 'global') ?? 'project',
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastAccessedAt: row.lastAccessedAt,
  }
}

/** PostgreSQL-backed storage repository using pgvector for vector search and pg_bigm for keyword search. */
export class PostgresStorageRepository implements StorageRepository {
  private readonly client: ReturnType<typeof postgres>
  private readonly db: ReturnType<typeof drizzle>

  /**
   * Creates a new PostgresStorageRepository instance.
   * @param connectionString - PostgreSQL connection URL
   * @param options - Optional configuration including max connection pool size
   */
  constructor(connectionString: string, options?: { maxConnections?: number }) {
    const DEFAULT_MAX_CONNECTIONS = 10
    this.client = postgres(connectionString, {
      max: options?.maxConnections ?? DEFAULT_MAX_CONNECTIONS,
    })
    this.db = drizzle(this.client)
  }

  /**
   * Closes the underlying PostgreSQL connection pool.
   * @returns A promise that resolves when all connections are closed
   */
  async close(): Promise<void> {
    await this.client.end()
  }

  /**
   * Saves or upserts a memory record into PostgreSQL.
   * @param memory - The memory to save (must include embedding)
   * @returns A promise that resolves when the memory is persisted
   */
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
        scope: memory.metadata.scope ?? 'project',
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
        lastAccessedAt: memory.lastAccessedAt,
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
          scope: memory.metadata.scope ?? 'project',
          updatedAt: memory.updatedAt,
          lastAccessedAt: memory.lastAccessedAt,
        },
      })
  }

  /**
   * Saves multiple memories sequentially.
   * @param batch - Array of memories to save
   * @returns A promise that resolves when all memories are persisted
   */
  async saveBatch(batch: Memory[]): Promise<void> {
    if (batch.length === 0) return
    for (const memory of batch) {
      await this.save(memory)
    }
  }

  /**
   * Finds a memory by its UUID.
   * @param id - The UUID of the memory to find
   * @returns The memory if found, or null
   */
  async findById(id: string): Promise<Memory | null> {
    const rows = await this.db.select().from(memories).where(eq(memories.id, id)).limit(1)
    if (rows.length === 0 || !rows[0]) return null
    return toMemory(rows[0])
  }

  /**
   * Deletes a memory by its UUID.
   * @param id - The UUID of the memory to delete
   * @returns A promise that resolves when the memory is deleted
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(memories).where(eq(memories.id, id))
  }

  /**
   * Deletes all memories from the database.
   * @returns A promise that resolves when all memories are cleared
   */
  async clear(): Promise<void> {
    await this.db.delete(memories)
  }

  /**
   * Lists memories with pagination, filtering, and sorting.
   * @param options - Pagination, filter, and sort options
   * @returns Array of memories matching the criteria
   */
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
      conditions.push(tagsOverlapCondition(tags))
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

    return rows.map((row) => toMemory(row))
  }

  /**
   * Searches memories by keyword using pg_bigm trigram similarity.
   * @param query - The keyword search query
   * @param limit - Maximum number of results to return
   * @param filter - Optional filter for project path, source, or tags
   * @returns Array of search results sorted by bigram similarity score
   */
  async searchByKeyword(
    query: string,
    limit: number,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    // LIKE filters rows containing the query; bigm_similarity scores relevance
    const escapedQuery = query.replace(/[%_\\]/g, '\\$&')
    const conditions = [sql`${memories.content} LIKE ${'%' + escapedQuery + '%'}`]

    if (filter?.projectPath) {
      conditions.push(
        sql`(${memories.projectPath} = ${filter.projectPath} OR ${memories.scope} = 'global')`,
      )
    }
    if (filter?.source) {
      conditions.push(eq(memories.source, filter.source))
    }
    if (filter?.tags && filter.tags.length > 0) {
      conditions.push(tagsOverlapCondition(filter.tags))
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
        scope: memories.scope,
        createdAt: memories.createdAt,
        updatedAt: memories.updatedAt,
        lastAccessedAt: memories.lastAccessedAt,
        similarity: similarityExpr,
      })
      .from(memories)
      .where(and(...conditions))
      .orderBy(sql`${similarityExpr} DESC`)
      .limit(limit)

    await this.touchLastAccessed(rows.map((r) => r.id))

    return rows.map((row) => ({
      memory: toMemory(row as DbRow),
      score: row.similarity ?? 0,
      matchType: 'keyword' as const,
    }))
  }

  /**
   * Searches memories by vector similarity using pgvector cosine distance.
   * @param embedding - The query embedding vector
   * @param limit - Maximum number of results to return
   * @param filter - Optional filter for project path, source, or tags
   * @returns Array of search results sorted by cosine similarity score
   */
  async searchByVector(
    embedding: number[],
    limit: number,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    const embeddingLiteral = `[${embedding.join(',')}]`

    const conditions = []
    if (filter?.projectPath) {
      conditions.push(
        sql`(${memories.projectPath} = ${filter.projectPath} OR ${memories.scope} = 'global')`,
      )
    }
    if (filter?.source) {
      conditions.push(eq(memories.source, filter.source))
    }
    if (filter?.tags && filter.tags.length > 0) {
      conditions.push(tagsOverlapCondition(filter.tags))
    }

    const distanceExpr = sql<number>`${memories.embedding} <=> ${embeddingLiteral}::vector`

    const rows = await this.db
      .select({
        id: memories.id,
        content: memories.content,
        embedding: memories.embedding,
        sessionId: memories.sessionId,
        projectPath: memories.projectPath,
        tags: memories.tags,
        source: memories.source,
        scope: memories.scope,
        createdAt: memories.createdAt,
        updatedAt: memories.updatedAt,
        lastAccessedAt: memories.lastAccessedAt,
        distance: distanceExpr,
      })
      .from(memories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(distanceExpr)
      .limit(limit)

    await this.touchLastAccessed(rows.map((r) => r.id))

    return rows.map((row) => ({
      memory: toMemory(row as DbRow, row.embedding as number[]),
      score: 1 - (row.distance ?? 0),
      matchType: 'vector' as const,
    }))
  }

  /**
   * Exports all memories ordered by creation date.
   * @returns Array of all stored memories
   */
  async exportAll(): Promise<Memory[]> {
    const rows = await this.db.select().from(memories).orderBy(asc(memories.createdAt))
    return rows.map((row) => toMemory(row))
  }

  /**
   * Returns aggregate statistics about stored memories.
   * @returns Storage statistics including counts, dates, and averages
   */
  async getStats(): Promise<StorageStats> {
    const result = await this.db
      .select({
        totalMemories: sql<number>`COUNT(*)::int`,
        totalSessions: sql<number>`COUNT(DISTINCT ${memories.sessionId})::int`,
        averageContentLength: sql<number>`COALESCE(AVG(LENGTH(${memories.content})), 0)::float`,
        oldestMemory: sql<Date | null>`MIN(${memories.createdAt})`,
        newestMemory: sql<Date | null>`MAX(${memories.createdAt})`,
        manualCount: sql<number>`COUNT(*) FILTER (WHERE ${memories.source} = 'manual')::int`,
        autoCount: sql<number>`COUNT(*) FILTER (WHERE ${memories.source} = 'auto')::int`,
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
        manualCount: 0,
        autoCount: 0,
      }
    }
    return {
      totalMemories: row.totalMemories,
      totalSessions: row.totalSessions,
      averageContentLength: row.averageContentLength,
      oldestMemory: row.oldestMemory ? new Date(row.oldestMemory) : null,
      newestMemory: row.newestMemory ? new Date(row.newestMemory) : null,
      manualCount: row.manualCount,
      autoCount: row.autoCount,
    }
  }

  /**
   * Deletes memories older than the specified number of days.
   * @param field - The date field to compare against
   * @param olderThanDays - Number of days threshold for deletion
   * @returns The number of deleted memories
   */
  async deleteOlderThan(
    field: 'lastAccessedAt' | 'createdAt',
    olderThanDays: number,
  ): Promise<number> {
    const col = field === 'lastAccessedAt' ? memories.lastAccessedAt : memories.createdAt
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)
    const result = await this.db
      .delete(memories)
      .where(sql`${col} < ${cutoff}`)
      .returning({ id: memories.id })
    return result.length
  }

  /**
   * Counts memories older than the specified number of days.
   * @param field - The date field to compare against
   * @param olderThanDays - Number of days threshold for counting
   * @returns The number of matching memories
   */
  async countOlderThan(
    field: 'lastAccessedAt' | 'createdAt',
    olderThanDays: number,
  ): Promise<number> {
    const col = field === 'lastAccessedAt' ? memories.lastAccessedAt : memories.createdAt
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(memories)
      .where(sql`${col} < ${cutoff}`)
    return result[0]?.count ?? 0
  }

  /** 検索ヒットした記憶のlastAccessedAtを現在時刻に更新（クリーンアップの判定基準） */
  private async touchLastAccessed(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.db
      .update(memories)
      .set({ lastAccessedAt: new Date() })
      .where(
        sql`${memories.id} = ANY(ARRAY[${sql.join(
          ids.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}])`,
      )
  }
}
