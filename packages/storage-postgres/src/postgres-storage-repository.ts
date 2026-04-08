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

/** PostgreSQLパラメータ上限(65535)を考慮したbulk insert時のチャンクサイズ（1行あたり約12パラメータ） */
const BULK_INSERT_CHUNK_SIZE = 500

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
    accessCount: row.accessCount,
  }
}

/** pgvectorによるvector検索とpg_bigmによるキーワード検索を備えた、PostgreSQL永続化リポジトリ。 */
export class PostgresStorageRepository implements StorageRepository {
  private readonly client: ReturnType<typeof postgres>
  private readonly db: ReturnType<typeof drizzle>

  /**
   * PostgresStorageRepositoryの新しいインスタンスを生成する。
   * @param connectionString - PostgreSQL接続URL
   * @param options - コネクションプール最大数などのオプション設定
   */
  constructor(connectionString: string, options?: { maxConnections?: number }) {
    const DEFAULT_MAX_CONNECTIONS = 10
    this.client = postgres(connectionString, {
      max: options?.maxConnections ?? DEFAULT_MAX_CONNECTIONS,
    })
    this.db = drizzle(this.client)
  }

  /**
   * PostgreSQLコネクションプールを閉じる。
   * @returns 全接続が閉じられたときに解決するPromise
   */
  async close(): Promise<void> {
    await this.client.end()
  }

  /**
   * メモリレコードをPostgreSQLに保存（upsert）する。
   * @param memory - 保存するメモリ（embeddingを含む必要がある）
   * @returns 永続化完了時に解決するPromise
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
        accessCount: memory.accessCount,
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
   * 複数のメモリを一括でPostgreSQLに保存（bulk upsert）する。
   * @param batch - 保存するメモリの配列（各要素にembeddingが必要）
   * @returns 全メモリの永続化完了時に解決するPromise
   */
  async saveBatch(batch: Memory[]): Promise<void> {
    if (batch.length === 0) return

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < batch.length; i += BULK_INSERT_CHUNK_SIZE) {
        const chunk = batch.slice(i, i + BULK_INSERT_CHUNK_SIZE)
        const values = chunk.map((memory) => {
          if (!memory.embedding) throw new Error('Cannot save memory without embedding')
          const embeddingLiteral = `[${memory.embedding.join(',')}]`
          return {
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
            accessCount: memory.accessCount,
          }
        })

        await tx
          .insert(memories)
          .values(values)
          .onConflictDoUpdate({
            target: memories.id,
            set: {
              content: sql`excluded.content`,
              embedding: sql`excluded.embedding`,
              sessionId: sql`excluded.session_id`,
              projectPath: sql`excluded.project_path`,
              tags: sql`excluded.tags`,
              source: sql`excluded.source`,
              scope: sql`excluded.scope`,
              updatedAt: sql`excluded.updated_at`,
              lastAccessedAt: sql`excluded.last_accessed_at`,
            },
          })
      }
    })
  }

  /**
   * UUIDでメモリを検索する。
   * @param id - 検索するメモリのUUID
   * @returns 見つかった場合はメモリ、見つからない場合はnull
   */
  async findById(id: string): Promise<Memory | null> {
    const rows = await this.db.select().from(memories).where(eq(memories.id, id)).limit(1)
    if (rows.length === 0 || !rows[0]) return null
    return toMemory(rows[0])
  }

  /**
   * UUIDでメモリを削除する。
   * @param id - 削除するメモリのUUID
   * @returns 削除完了時に解決するPromise
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(memories).where(eq(memories.id, id))
  }

  /**
   * データベース上の全メモリを削除する。
   * @returns 全削除完了時に解決するPromise
   */
  async clear(): Promise<void> {
    await this.db.delete(memories)
  }

  /**
   * ページネーション・フィルタ・ソートを指定してメモリを一覧取得する。
   * @param options - ページネーション・フィルタ・ソートのオプション
   * @returns 条件に一致するメモリの配列
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
   * pg_bigm trigram類似度によるキーワード検索を行う。
   * @param query - キーワード検索クエリ
   * @param limit - 返す結果の最大件数
   * @param filter - プロジェクトパス・ソース・タグのフィルタ（省略可）
   * @returns bigram類似度スコア順のSearchResult配列
   */
  async searchByKeyword(
    query: string,
    limit: number,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    // LIKE filters rows containing the query; bigm_similarity scores relevance
    const escapedQuery = query.replace(/[%_\\]/g, '\\$&')
    const conditions = [sql`${memories.content} LIKE ${`%${escapedQuery}%`}`]

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
        accessCount: memories.accessCount,
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
   * pgvectorのcosine距離によるvector類似検索を行う。
   * @param embedding - クエリのembedding vector
   * @param limit - 返す結果の最大件数
   * @param filter - プロジェクトパス・ソース・タグのフィルタ（省略可）
   * @returns cosine similarity スコア順のSearchResult配列
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
        accessCount: memories.accessCount,
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
   * 全メモリを作成日順でエクスポートする。
   * @returns 保存された全メモリの配列
   */
  async exportAll(): Promise<Memory[]> {
    const rows = await this.db.select().from(memories).orderBy(asc(memories.createdAt))
    return rows.map((row) => toMemory(row))
  }

  /**
   * 保存済みメモリの集計統計を返す。
   * @returns 件数・日時・平均値などを含むストレージ統計
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
   * 指定日数より古いメモリを削除する。
   * @param field - 比較対象の日付フィールド
   * @param olderThanDays - 削除基準となる経過日数
   * @returns 削除されたメモリの件数
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
   * 指定日数より古いメモリの件数を返す。
   * @param field - 比較対象の日付フィールド
   * @param olderThanDays - カウント基準となる経過日数
   * @returns 条件に一致するメモリの件数
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

  /** 検索ヒットした記憶のlastAccessedAtを現在時刻に更新し、access_countをインクリメントする */
  private async touchLastAccessed(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.db
      .update(memories)
      .set({
        lastAccessedAt: new Date(),
        accessCount: sql`${memories.accessCount} + 1`,
      })
      .where(
        sql`${memories.id} = ANY(ARRAY[${sql.join(
          ids.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}])`,
      )
  }
}
