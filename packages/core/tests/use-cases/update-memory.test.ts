import { describe, expect, it, vi } from 'vitest'
import type { EmbeddingProvider } from '../../src/interfaces/embedding-provider.js'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import { UpdateMemoryUseCase } from '../../src/use-cases/update-memory.js'

function createMockStorage(): StorageRepository {
  return {
    save: vi.fn(),
    saveBatch: vi.fn(),
    findById: vi.fn(),
    searchByKeyword: vi.fn(),
    searchByVector: vi.fn(),
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

describe('UpdateMemoryUseCase', () => {
  it('should update content and re-embed', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const existing = {
      id: 'mem-1',
      content: 'old content',
      embedding: [0.5, 0.6, 0.7],
      metadata: { sessionId: 's1', tags: ['old'], source: 'manual' as const },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      lastAccessedAt: new Date('2026-01-01'),
    }
    vi.mocked(storage.findById).mockResolvedValue(existing)

    const useCase = new UpdateMemoryUseCase(storage, embedding)
    await useCase.execute({ id: 'mem-1', content: 'new content' })

    expect(embedding.embed).toHaveBeenCalledWith('new content')
    expect(storage.save).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(storage.save).mock.calls[0]![0]
    expect(saved.content).toBe('new content')
    expect(saved.embedding).toEqual([0.1, 0.2, 0.3])
    expect(saved.createdAt).toEqual(new Date('2026-01-01'))
    expect(saved.updatedAt.getTime()).toBeGreaterThan(existing.updatedAt.getTime())
  })

  it('should update tags without re-embedding', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const existing = {
      id: 'mem-1',
      content: 'same content',
      embedding: [0.5, 0.6, 0.7],
      metadata: { sessionId: 's1', tags: ['old'], source: 'manual' as const },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      lastAccessedAt: new Date('2026-01-01'),
    }
    vi.mocked(storage.findById).mockResolvedValue(existing)

    const useCase = new UpdateMemoryUseCase(storage, embedding)
    await useCase.execute({ id: 'mem-1', tags: ['new-tag'] })

    expect(embedding.embed).not.toHaveBeenCalled()
    const saved = vi.mocked(storage.save).mock.calls[0]![0]
    expect(saved.content).toBe('same content')
    expect(saved.metadata.tags).toEqual(['new-tag'])
    expect(saved.embedding).toEqual([0.5, 0.6, 0.7])
  })

  it('should throw MemoryNotFoundError for non-existent ID', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    vi.mocked(storage.findById).mockResolvedValue(null)

    const useCase = new UpdateMemoryUseCase(storage, embedding)
    await expect(useCase.execute({ id: 'missing', content: 'x' })).rejects.toThrow(
      'Memory not found: missing',
    )
  })
})
