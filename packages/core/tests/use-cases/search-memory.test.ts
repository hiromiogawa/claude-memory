import { describe, expect, it, vi } from 'vitest'
import type { Memory } from '../../src/entities/memory.js'
import type { EmbeddingProvider } from '../../src/interfaces/embedding-provider.js'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import { SearchMemoryUseCase } from '../../src/use-cases/search-memory.js'

function makeMemory(id: string, daysAgo: number = 0): Memory {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return {
    id,
    content: `content-${id}`,
    embedding: [0.1],
    metadata: { sessionId: 's1', source: 'manual' },
    createdAt: date,
    updatedAt: date,
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
