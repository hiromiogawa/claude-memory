import { sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

const embeddingDimension = Number(process.env.EMBEDDING_DIMENSION ?? '384')

/** Drizzle table definition for the memories table with pgvector and pg_bigm indexes. */
export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: embeddingDimension }),
    sessionId: text('session_id'),
    projectPath: text('project_path'),
    tags: text('tags').array(),
    source: text('source').$type<'manual' | 'auto'>(),
    scope: text('scope').$type<'project' | 'global'>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_memories_bigm').using('gin', sql`${table.content} gin_bigm_ops`),
    index('idx_memories_vector').using('hnsw', sql`${table.embedding} vector_cosine_ops`),
  ],
)

/** Zod schema for validating memory insert operations. */
export const insertMemorySchema: ReturnType<typeof createInsertSchema<typeof memories>> =
  createInsertSchema(memories, {
    content: (schema) => schema.min(1, '空文字不可'),
  })

/** Zod schema for validating memory select results. */
export const selectMemorySchema = createSelectSchema(memories)
