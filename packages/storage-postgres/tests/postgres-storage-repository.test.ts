import { randomUUID } from 'node:crypto'
import type { Memory } from '@claude-memory/core'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { PostgresStorageRepository } from '../src/postgres-storage-repository.js'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5434/claude_memory_test'

function makeEmbedding(): number[] {
  return Array.from({ length: 384 }, () => Math.random())
}

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: randomUUID(),
    content: 'This is a test memory content',
    embedding: makeEmbedding(),
    metadata: {
      sessionId: 'session-001',
      projectPath: '/home/user/project',
      tags: ['test', 'unit'],
      source: 'manual',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('PostgresStorageRepository', () => {
  let repo: PostgresStorageRepository

  beforeEach(async () => {
    repo = new PostgresStorageRepository(DATABASE_URL)
    await repo.clear()
  })

  afterAll(async () => {
    await repo.close()
  })

  describe('save and findById', () => {
    it('saves a memory and retrieves it by ID', async () => {
      const memory = makeMemory({ content: 'Hello, world!' })
      await repo.save(memory)

      const found = await repo.findById(memory.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(memory.id)
      expect(found!.content).toBe('Hello, world!')
      expect(found!.metadata.sessionId).toBe(memory.metadata.sessionId)
      expect(found!.metadata.projectPath).toBe(memory.metadata.projectPath)
      expect(found!.metadata.source).toBe(memory.metadata.source)
      expect(found!.metadata.tags).toEqual(memory.metadata.tags)
    })

    it('updates an existing memory on save (upsert)', async () => {
      const memory = makeMemory({ content: 'Original content' })
      await repo.save(memory)

      const updated = { ...memory, content: 'Updated content', updatedAt: new Date() }
      await repo.save(updated)

      const found = await repo.findById(memory.id)
      expect(found!.content).toBe('Updated content')
    })
  })

  describe('findById', () => {
    it('returns null for a non-existent ID', async () => {
      const result = await repo.findById(randomUUID())
      expect(result).toBeNull()
    })

    it('returns null embedding for found memory', async () => {
      const memory = makeMemory()
      await repo.save(memory)
      const found = await repo.findById(memory.id)
      expect(found!.embedding).toBeNull()
    })
  })

  describe('saveBatch', () => {
    it('saves multiple memories', async () => {
      const memories = [makeMemory(), makeMemory(), makeMemory()]
      await repo.saveBatch(memories)

      const stats = await repo.getStats()
      expect(stats.totalMemories).toBe(3)
    })

    it('handles empty batch without error', async () => {
      await expect(repo.saveBatch([])).resolves.not.toThrow()
    })
  })

  describe('delete', () => {
    it('deletes a memory by ID', async () => {
      const memory = makeMemory()
      await repo.save(memory)

      await repo.delete(memory.id)

      const found = await repo.findById(memory.id)
      expect(found).toBeNull()
    })

    it('does not throw when deleting a non-existent ID', async () => {
      await expect(repo.delete(randomUUID())).resolves.not.toThrow()
    })
  })

  describe('clear', () => {
    it('removes all memories', async () => {
      await repo.saveBatch([makeMemory(), makeMemory(), makeMemory()])

      await repo.clear()

      const stats = await repo.getStats()
      expect(stats.totalMemories).toBe(0)
    })
  })

  describe('list', () => {
    beforeEach(async () => {
      const memories = [
        makeMemory({ metadata: { sessionId: 's1', source: 'manual' } }),
        makeMemory({ metadata: { sessionId: 's1', source: 'auto' } }),
        makeMemory({ metadata: { sessionId: 's2', source: 'manual' } }),
        makeMemory({ metadata: { sessionId: 's2', source: 'auto' } }),
        makeMemory({ metadata: { sessionId: 's3', source: 'manual' } }),
      ]
      await repo.saveBatch(memories)
    })

    it('returns all memories with default pagination', async () => {
      const results = await repo.list({ limit: 10, offset: 0 })
      expect(results).toHaveLength(5)
    })

    it('applies limit and offset for pagination', async () => {
      const page1 = await repo.list({ limit: 2, offset: 0 })
      const page2 = await repo.list({ limit: 2, offset: 2 })
      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
      // Pages should not overlap
      const ids1 = page1.map((m) => m.id)
      const ids2 = page2.map((m) => m.id)
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0)
    })

    it('filters by source', async () => {
      const manualMemories = await repo.list({ limit: 10, offset: 0, source: 'manual' })
      expect(manualMemories).toHaveLength(3)
      expect(manualMemories.every((m) => m.metadata.source === 'manual')).toBe(true)
    })

    it('filters by sessionId', async () => {
      const session1 = await repo.list({ limit: 10, offset: 0, sessionId: 's1' })
      expect(session1).toHaveLength(2)
      expect(session1.every((m) => m.metadata.sessionId === 's1')).toBe(true)
    })

    it('returns null embedding for listed memories', async () => {
      await repo.save(makeMemory())
      const results = await repo.list({ limit: 10, offset: 0 })
      expect(results[0]!.embedding).toBeNull()
    })

    it('sorts by createdAt desc', async () => {
      const results = await repo.list({
        limit: 10,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          results[i].createdAt.getTime(),
        )
      }
    })
  })

  describe('searchByKeyword', () => {
    beforeEach(async () => {
      await repo.saveBatch([
        makeMemory({ content: 'TypeScript is a strongly typed language' }),
        makeMemory({ content: 'JavaScript is dynamically typed' }),
        makeMemory({ content: 'Python is great for data science' }),
        makeMemory({
          content: 'TypeScript and JavaScript are related',
          metadata: { sessionId: 'sx', projectPath: '/other/project', source: 'auto' },
        }),
      ])
    })

    it('returns memories matching keyword', async () => {
      const results = await repo.searchByKeyword('TypeScript', 10)
      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results.every((r) => r.memory.content.includes('TypeScript'))).toBe(true)
    })

    it('returns empty array when no match', async () => {
      const results = await repo.searchByKeyword('Haskell', 10)
      expect(results).toHaveLength(0)
    })

    it('respects the limit parameter', async () => {
      const results = await repo.searchByKeyword('typed', 1)
      expect(results).toHaveLength(1)
    })

    it('has matchType set to keyword', async () => {
      const results = await repo.searchByKeyword('Python', 10)
      expect(results[0].matchType).toBe('keyword')
    })

    it('filters by projectPath', async () => {
      const results = await repo.searchByKeyword('TypeScript', 10, {
        projectPath: '/other/project',
      })
      expect(results).toHaveLength(1)
      expect(results[0].memory.content).toContain('TypeScript and JavaScript')
    })

    it('returns results ordered by bigm similarity score', async () => {
      await repo.clear()
      await repo.saveBatch([
        makeMemory({ content: 'TypeScript is a strongly typed language' }),
        makeMemory({ content: 'TypeScript and JavaScript are related to TypeScript' }),
        makeMemory({ content: 'Python is great for data science' }),
      ])

      const results = await repo.searchByKeyword('TypeScript', 10)
      expect(results.length).toBeGreaterThanOrEqual(2)
      // Results should be ordered by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score)
      }
      // Scores should NOT all be identical
      const scores = results.map((r) => r.score)
      const uniqueScores = new Set(scores)
      expect(uniqueScores.size).toBeGreaterThan(1)
    })
  })

  describe('searchByVector', () => {
    it('returns nearest neighbors by cosine similarity', async () => {
      const embedding1 = makeEmbedding()
      const memory1 = makeMemory({ content: 'First memory', embedding: embedding1 })
      const memory2 = makeMemory({ content: 'Second memory', embedding: makeEmbedding() })
      await repo.saveBatch([memory1, memory2])

      // Searching with the exact same embedding should find memory1 as top result
      const results = await repo.searchByVector(embedding1, 2)
      expect(results).toHaveLength(2)
      expect(results[0].memory.id).toBe(memory1.id)
      expect(results[0].matchType).toBe('vector')
      expect(results[0].score).toBeGreaterThanOrEqual(0)
    })

    it('respects the limit parameter', async () => {
      await repo.saveBatch([makeMemory(), makeMemory(), makeMemory()])
      const results = await repo.searchByVector(makeEmbedding(), 2)
      expect(results).toHaveLength(2)
    })

    it('filters by projectPath', async () => {
      const target = makeMemory({
        content: 'Target memory',
        metadata: { sessionId: 's1', projectPath: '/target/path', source: 'manual' },
      })
      const other = makeMemory({
        content: 'Other memory',
        metadata: { sessionId: 's2', projectPath: '/other/path', source: 'manual' },
      })
      await repo.saveBatch([target, other])

      const results = await repo.searchByVector(makeEmbedding(), 10, {
        projectPath: '/target/path',
      })
      expect(results).toHaveLength(1)
      expect(results[0].memory.id).toBe(target.id)
    })
  })

  describe('getStats', () => {
    it('returns zeros when no memories', async () => {
      const stats = await repo.getStats()
      expect(stats.totalMemories).toBe(0)
      expect(stats.totalSessions).toBe(0)
      expect(stats.averageContentLength).toBe(0)
      expect(stats.oldestMemory).toBeNull()
      expect(stats.newestMemory).toBeNull()
    })

    it('returns correct stats with data', async () => {
      await repo.saveBatch([
        makeMemory({ content: 'Short', metadata: { sessionId: 'sess-a', source: 'manual' } }),
        makeMemory({
          content: 'A bit longer content',
          metadata: { sessionId: 'sess-b', source: 'auto' },
        }),
        makeMemory({ content: 'Another one', metadata: { sessionId: 'sess-a', source: 'manual' } }),
      ])

      const stats = await repo.getStats()
      expect(stats.totalMemories).toBe(3)
      expect(stats.totalSessions).toBe(2)
      expect(stats.averageContentLength).toBeGreaterThan(0)
      expect(stats.oldestMemory).toBeInstanceOf(Date)
      expect(stats.newestMemory).toBeInstanceOf(Date)
    })
  })
})
