import { describe, expect, it, vi } from 'vitest'
import type { Memory } from '../../src/entities/memory.js'
import type { EmbeddingProvider } from '../../src/interfaces/embedding-provider.js'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import { SearchMemoryUseCase } from '../../src/use-cases/search-memory.js'

function makeMemory(id: string, daysAgo: number = 0, accessCount: number = 0): Memory {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return {
    id,
    content: `content-${id}`,
    embedding: [0.1],
    metadata: { sessionId: 's1', source: 'manual' },
    createdAt: date,
    updatedAt: date,
    lastAccessedAt: date,
    accessCount,
  }
}

function createMockStorage(): StorageRepository {
  return {
    save: vi.fn(),
    saveBatch: vi.fn(),
    findById: vi.fn(),
    searchByKeyword: vi.fn().mockResolvedValue([]),
    searchByVector: vi.fn().mockResolvedValue([]),
    list: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn(),
    exportAll: vi.fn(),
    deleteOlderThan: vi.fn(),
    countOlderThan: vi.fn(),
  }
}

function createMockEmbedding(): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    embedBatch: vi.fn(),
    getDimension: vi.fn().mockReturnValue(384),
  }
}

describe('SearchMemoryUseCase', () => {
  it('should combine keyword and vector results via RRF', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const mem1 = makeMemory('1')
    const mem2 = makeMemory('2')
    const mem3 = makeMemory('3')

    vi.mocked(storage.searchByKeyword).mockResolvedValue([
      { memory: mem1, score: 0.9, matchType: 'keyword' },
      { memory: mem2, score: 0.7, matchType: 'keyword' },
    ])
    vi.mocked(storage.searchByVector).mockResolvedValue([
      { memory: mem2, score: 0.95, matchType: 'vector' },
      { memory: mem3, score: 0.8, matchType: 'vector' },
    ])

    const useCase = new SearchMemoryUseCase(storage, embedding)
    const results = await useCase.search('test query', 10)

    expect(embedding.embed).toHaveBeenCalledWith('test query')
    expect(results.length).toBe(3)
    expect(results[0]!.memory.id).toBe('2') // appears in both = highest RRF
    expect(results[0]!.matchType).toBe('hybrid')
  })

  it('should apply time decay to older memories', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const recentMem = makeMemory('recent', 0)
    const oldMem = makeMemory('old', 60)

    vi.mocked(storage.searchByKeyword).mockResolvedValue([
      { memory: recentMem, score: 0.8, matchType: 'keyword' },
      { memory: oldMem, score: 0.8, matchType: 'keyword' },
    ])
    vi.mocked(storage.searchByVector).mockResolvedValue([])

    const useCase = new SearchMemoryUseCase(storage, embedding)
    const results = await useCase.search('test', 10)

    const recentResult = results.find((r) => r.memory.id === 'recent')!
    const oldResult = results.find((r) => r.memory.id === 'old')!
    expect(recentResult.score).toBeGreaterThan(oldResult.score)
  })

  it('should boost score for frequently accessed memories', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const frequentMem = makeMemory('frequent', 0, 50)
    const rareMem = makeMemory('rare', 0, 0)

    vi.mocked(storage.searchByKeyword).mockResolvedValue([
      { memory: frequentMem, score: 0.8, matchType: 'keyword' },
      { memory: rareMem, score: 0.8, matchType: 'keyword' },
    ])
    vi.mocked(storage.searchByVector).mockResolvedValue([])

    const useCase = new SearchMemoryUseCase(storage, embedding)
    const results = await useCase.search('test', 10)

    const frequentResult = results.find((r) => r.memory.id === 'frequent')!
    const rareResult = results.find((r) => r.memory.id === 'rare')!
    // 50 accesses should give 1.2x boost vs 1.0x for 0 accesses
    expect(frequentResult.score).toBeGreaterThan(rareResult.score)
    expect(frequentResult.score / rareResult.score).toBeCloseTo(1.2, 1)
  })

  it('should cap access boost at 1.2x even for very high access counts', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const mem50 = makeMemory('a50', 0, 50)
    const mem1000 = makeMemory('a1000', 0, 1000)
    const memZero = makeMemory('a0', 0, 0)

    // Use vector results where each memory is at the same rank position in separate calls
    vi.mocked(storage.searchByKeyword).mockResolvedValue([])
    vi.mocked(storage.searchByVector).mockResolvedValue([
      { memory: memZero, score: 0.9, matchType: 'vector' },
      { memory: mem50, score: 0.8, matchType: 'vector' },
      { memory: mem1000, score: 0.7, matchType: 'vector' },
    ])

    const useCase = new SearchMemoryUseCase(storage, embedding)
    const results = await useCase.search('test', 10)

    const result50 = results.find((r) => r.memory.id === 'a50')!
    const result1000 = results.find((r) => r.memory.id === 'a1000')!
    // Both at 50+ accesses should have the same 1.2x boost (capped)
    // They have different RRF ranks, so compare the boost ratio instead
    const resultZero = results.find((r) => r.memory.id === 'a0')!
    // mem50 gets 1.2x boost, mem1000 also gets 1.2x (capped), memZero gets 1.0x
    // Verify that 50 and 1000 accesses produce the same boost factor
    // ratio of score_50/score_1000 should equal ratio of their RRF base scores (no extra boost diff)
    const rrfRank2 = 1 / (60 + 2)
    const rrfRank3 = 1 / (60 + 3)
    expect(result50.score / result1000.score).toBeCloseTo(rrfRank2 / rrfRank3, 5)
  })

  it('should pass filter to storage methods', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const useCase = new SearchMemoryUseCase(storage, embedding)
    await useCase.search('test', 10, { projectPath: '/my/project' })

    expect(storage.searchByKeyword).toHaveBeenCalledWith('test', 10, { projectPath: '/my/project' })
    expect(storage.searchByVector).toHaveBeenCalledWith([0.1, 0.2, 0.3], 10, {
      projectPath: '/my/project',
    })
  })
})
