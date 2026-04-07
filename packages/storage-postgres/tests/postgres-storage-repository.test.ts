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
    lastAccessedAt: new Date(),
    accessCount: 0,
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

  describe('constructor options', () => {
    it('accepts custom pool size option', async () => {
      const customRepo = new PostgresStorageRepository(DATABASE_URL, { maxConnections: 5 })
      expect(customRepo).toBeDefined()
      await customRepo.close()
    })

    it('works with default pool size when no options given', async () => {
      const defaultRepo = new PostgresStorageRepository(DATABASE_URL)
      expect(defaultRepo).toBeDefined()
      await defaultRepo.close()
    })
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
      const now = Date.now()
      const memories = [
        makeMemory({
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
      ]
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
      const now = Date.now()
      await repo.saveBatch([
        makeMemory({
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
      ])

      await repo.clear()

      const stats = await repo.getStats()
      expect(stats.totalMemories).toBe(0)
    })
  })

  describe('list', () => {
    beforeEach(async () => {
      const now = Date.now()
      const memories = [
        makeMemory({
          metadata: { sessionId: 's1', source: 'manual' },
          createdAt: new Date(now - 4000),
          updatedAt: new Date(now - 4000),
          lastAccessedAt: new Date(now - 4000),
        }),
        makeMemory({
          metadata: { sessionId: 's1', source: 'auto' },
          createdAt: new Date(now - 3000),
          updatedAt: new Date(now - 3000),
          lastAccessedAt: new Date(now - 3000),
        }),
        makeMemory({
          metadata: { sessionId: 's2', source: 'manual' },
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          metadata: { sessionId: 's2', source: 'auto' },
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          metadata: { sessionId: 's3', source: 'manual' },
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
      ]
      await repo.saveBatch(memories)
    })

    it('returns all memories with default pagination', async () => {
      const results = await repo.list({ limit: 10, offset: 0 })
      expect(results).toHaveLength(5)
    })

    it('applies limit and offset for pagination', async () => {
      const all = await repo.list({ limit: 10, offset: 0 })
      const page1 = await repo.list({ limit: 2, offset: 0 })
      const page2 = await repo.list({ limit: 2, offset: 2 })
      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
      // Pages should contain different items from the full list
      expect(page1[0]!.id).toBe(all[0]!.id)
      expect(page2[0]!.id).toBe(all[2]!.id)
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

    it('filters by tags', async () => {
      await repo.clear()
      const now = Date.now()
      await repo.saveBatch([
        makeMemory({
          metadata: { sessionId: 's1', tags: ['design'], source: 'manual' },
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          metadata: { sessionId: 's1', tags: ['bug'], source: 'manual' },
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          metadata: { sessionId: 's1', tags: ['design', 'bug'], source: 'manual' },
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
      ])
      const results = await repo.list({ limit: 10, offset: 0, tags: ['design'] })
      expect(results).toHaveLength(2)
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
      const now = Date.now()
      await repo.saveBatch([
        makeMemory({
          content: 'TypeScript is a strongly typed language',
          createdAt: new Date(now - 3000),
          updatedAt: new Date(now - 3000),
          lastAccessedAt: new Date(now - 3000),
        }),
        makeMemory({
          content: 'JavaScript is dynamically typed',
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          content: 'Python is great for data science',
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          content: 'TypeScript and JavaScript are related',
          metadata: { sessionId: 'sx', projectPath: '/other/project', source: 'auto' },
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
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

    it('filters by tags', async () => {
      await repo.clear()
      const now = Date.now()
      await repo.saveBatch([
        makeMemory({
          content: 'TypeScript with tag',
          metadata: { sessionId: 's1', tags: ['frontend', 'typescript'], source: 'manual' },
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          content: 'TypeScript without tag',
          metadata: { sessionId: 's1', tags: ['backend'], source: 'manual' },
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
      ])
      const results = await repo.searchByKeyword('TypeScript', 10, { tags: ['frontend'] })
      expect(results).toHaveLength(1)
      expect(results[0]!.memory.metadata.tags).toContain('frontend')
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
      const now = Date.now()
      await repo.saveBatch([
        makeMemory({
          content: 'TypeScript is a strongly typed language',
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          content: 'TypeScript and JavaScript are related to TypeScript',
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          content: 'Python is great for data science',
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
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
      const now = Date.now()
      const embedding1 = makeEmbedding()
      const memory1 = makeMemory({
        content: 'First memory',
        embedding: embedding1,
        createdAt: new Date(now - 1000),
        updatedAt: new Date(now - 1000),
        lastAccessedAt: new Date(now - 1000),
      })
      const memory2 = makeMemory({
        content: 'Second memory',
        embedding: makeEmbedding(),
        createdAt: new Date(now),
        updatedAt: new Date(now),
        lastAccessedAt: new Date(now),
      })
      await repo.saveBatch([memory1, memory2])

      // Searching with the exact same embedding should find memory1 as top result
      const results = await repo.searchByVector(embedding1, 2)
      expect(results).toHaveLength(2)
      expect(results[0].memory.id).toBe(memory1.id)
      expect(results[0].matchType).toBe('vector')
      expect(results[0].score).toBeGreaterThanOrEqual(0)
    })

    it('respects the limit parameter', async () => {
      const now = Date.now()
      await repo.saveBatch([
        makeMemory({
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
      ])
      const results = await repo.searchByVector(makeEmbedding(), 2)
      expect(results).toHaveLength(2)
    })

    it('filters by projectPath', async () => {
      const now = Date.now()
      const target = makeMemory({
        content: 'Target memory',
        metadata: { sessionId: 's1', projectPath: '/target/path', source: 'manual' },
        createdAt: new Date(now - 1000),
        updatedAt: new Date(now - 1000),
        lastAccessedAt: new Date(now - 1000),
      })
      const other = makeMemory({
        content: 'Other memory',
        metadata: { sessionId: 's2', projectPath: '/other/path', source: 'manual' },
        createdAt: new Date(now),
        updatedAt: new Date(now),
        lastAccessedAt: new Date(now),
      })
      await repo.saveBatch([target, other])

      const results = await repo.searchByVector(makeEmbedding(), 10, {
        projectPath: '/target/path',
      })
      expect(results).toHaveLength(1)
      expect(results[0].memory.id).toBe(target.id)
    })
  })

  describe('scope filtering', () => {
    it('returns global scope memories alongside project-specific ones in keyword search', async () => {
      const now = Date.now()
      await repo.saveBatch([
        makeMemory({
          content: 'project-specific memory',
          metadata: {
            sessionId: 's1',
            projectPath: '/project-a',
            scope: 'project',
            source: 'manual',
          },
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          content: 'global preference memory',
          metadata: {
            sessionId: 's1',
            projectPath: '/project-b',
            scope: 'global',
            source: 'manual',
          },
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          content: 'other project memory',
          metadata: {
            sessionId: 's1',
            projectPath: '/project-b',
            scope: 'project',
            source: 'manual',
          },
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
      ])

      const results = await repo.searchByKeyword('memory', 10, {
        projectPath: '/project-a',
      })
      // Should find project-a specific + global, but NOT project-b specific
      expect(results).toHaveLength(2)
      const contents = results.map((r) => r.memory.content)
      expect(contents).toContain('project-specific memory')
      expect(contents).toContain('global preference memory')
      expect(contents).not.toContain('other project memory')
    })

    it('returns global scope memories alongside project-specific ones in vector search', async () => {
      const now = Date.now()
      await repo.saveBatch([
        makeMemory({
          content: 'project-specific memory',
          metadata: {
            sessionId: 's1',
            projectPath: '/project-a',
            scope: 'project',
            source: 'manual',
          },
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          content: 'global preference memory',
          metadata: {
            sessionId: 's1',
            projectPath: '/project-b',
            scope: 'global',
            source: 'manual',
          },
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          content: 'other project memory',
          metadata: {
            sessionId: 's1',
            projectPath: '/project-b',
            scope: 'project',
            source: 'manual',
          },
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
      ])

      const results = await repo.searchByVector(makeEmbedding(), 10, {
        projectPath: '/project-a',
      })
      expect(results).toHaveLength(2)
      const ids = results.map((r) => r.memory.content)
      expect(ids).toContain('project-specific memory')
      expect(ids).toContain('global preference memory')
    })

    it('saves and retrieves scope in metadata', async () => {
      const memory = makeMemory({
        content: 'global memory',
        metadata: {
          sessionId: 's1',
          projectPath: '/some/path',
          scope: 'global',
          source: 'manual',
        },
      })
      await repo.save(memory)

      const found = await repo.findById(memory.id)
      expect(found).not.toBeNull()
      expect(found!.metadata.scope).toBe('global')
    })

    it('defaults scope to project when not specified', async () => {
      const memory = makeMemory({
        content: 'memory without scope',
        metadata: { sessionId: 's1', source: 'manual' },
      })
      await repo.save(memory)

      const found = await repo.findById(memory.id)
      expect(found).not.toBeNull()
      expect(found!.metadata.scope).toBe('project')
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
      expect(stats.manualCount).toBe(0)
      expect(stats.autoCount).toBe(0)
    })

    it('returns correct stats with data', async () => {
      const now = Date.now()
      await repo.saveBatch([
        makeMemory({
          content: 'Short',
          metadata: { sessionId: 'sess-a', source: 'manual' },
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
          lastAccessedAt: new Date(now - 2000),
        }),
        makeMemory({
          content: 'A bit longer content',
          metadata: { sessionId: 'sess-b', source: 'auto' },
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
          lastAccessedAt: new Date(now - 1000),
        }),
        makeMemory({
          content: 'Another one',
          metadata: { sessionId: 'sess-a', source: 'manual' },
          createdAt: new Date(now),
          updatedAt: new Date(now),
          lastAccessedAt: new Date(now),
        }),
      ])

      const stats = await repo.getStats()
      expect(stats.totalMemories).toBe(3)
      expect(stats.totalSessions).toBe(2)
      expect(stats.averageContentLength).toBeGreaterThan(0)
      expect(stats.oldestMemory).toBeInstanceOf(Date)
      expect(stats.newestMemory).toBeInstanceOf(Date)
      expect(stats.manualCount).toBe(2)
      expect(stats.autoCount).toBe(1)
    })
  })
})
