import { describe, expect, it, vi } from 'vitest'
import type { ConversationLog } from '../../src/entities/conversation.js'
import type { ChunkingStrategy } from '../../src/interfaces/chunking-strategy.js'
import type { EmbeddingProvider } from '../../src/interfaces/embedding-provider.js'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import { defineSaveMemoryUseCase } from '../../src/use-cases/save-memory.js'

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
    countAll: vi.fn().mockResolvedValue(0),
    deleteLeastAccessed: vi.fn().mockResolvedValue(0),
  }
}

function createMockEmbedding(): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    embedBatch: vi.fn().mockResolvedValue([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]),
    getDimension: vi.fn().mockReturnValue(3),
  }
}

function createMockChunking(): ChunkingStrategy {
  return {
    chunk: vi.fn().mockReturnValue([
      {
        content: 'Q: hello\nA: world',
        metadata: { sessionId: 's1', source: 'auto' as const },
      },
    ]),
  }
}

describe('SaveMemoryUseCase', () => {
  it('should save a manual memory with embedding', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()
    vi.mocked(storage.searchByVector).mockResolvedValue([])
    const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)

    const result = await useCase.saveManual({
      content: 'test content',
      sessionId: 'session-1',
      projectPath: '/project',
    })

    expect(result.saved).toBe(true)
    expect(embedding.embed).toHaveBeenCalledWith('test content')
    expect(storage.save).toHaveBeenCalledTimes(1)
    const savedMemory = vi.mocked(storage.save).mock.calls[0]![0]
    expect(savedMemory.content).toBe('test content')
    expect(savedMemory.embedding).toEqual([0.1, 0.2, 0.3])
    expect(savedMemory.metadata.source).toBe('manual')
  })

  it('should save conversation as auto memories via chunking', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()
    vi.mocked(storage.searchByVector).mockResolvedValue([])
    const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)

    const log: ConversationLog = {
      sessionId: 'session-1',
      messages: [
        { role: 'user', content: 'hello', timestamp: new Date() },
        { role: 'assistant', content: 'world', timestamp: new Date() },
      ],
    }

    await useCase.saveConversation(log)

    expect(chunking.chunk).toHaveBeenCalledWith(log)
    expect(embedding.embedBatch).toHaveBeenCalled()
    expect(storage.saveBatch).toHaveBeenCalledTimes(1)
  })

  it('should skip failed embeddings and save successful ones', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()
    vi.mocked(chunking.chunk).mockReturnValue([
      { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
      { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
    ])
    vi.mocked(embedding.embedBatch).mockResolvedValue([[0.1, 0.2, 0.3], []])
    vi.mocked(storage.searchByVector).mockResolvedValue([])

    const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
    const log: ConversationLog = {
      sessionId: 's1',
      messages: [
        { role: 'user', content: 'q1', timestamp: new Date() },
        { role: 'assistant', content: 'a1', timestamp: new Date() },
        { role: 'user', content: 'q2', timestamp: new Date() },
        { role: 'assistant', content: 'a2', timestamp: new Date() },
      ],
    }

    await useCase.saveConversation(log)
    const savedMemories = vi.mocked(storage.saveBatch).mock.calls[0]![0]
    expect(savedMemories.length).toBe(1)
  })

  it('should skip saving when a similar memory already exists', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()

    vi.mocked(storage.searchByVector).mockResolvedValue([
      {
        memory: {
          id: 'existing-id',
          content: 'very similar content',
          embedding: [0.1, 0.2, 0.3],
          metadata: { sessionId: 's0', source: 'manual' },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
        },
        score: 0.96,
        matchType: 'vector',
      },
    ])

    const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
    const result = await useCase.saveManual({
      content: 'very similar content!',
      sessionId: 'session-1',
    })

    expect(result.saved).toBe(false)
    expect(storage.searchByVector).toHaveBeenCalledWith([0.1, 0.2, 0.3], 1)
    expect(storage.save).not.toHaveBeenCalled()
  })

  it('should save when no similar memory exists', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()

    vi.mocked(storage.searchByVector).mockResolvedValue([])

    const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
    await useCase.saveManual({
      content: 'unique content',
      sessionId: 'session-1',
    })

    expect(storage.save).toHaveBeenCalledTimes(1)
  })

  it('should skip saving when similarity is between 0.90 and 0.95', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()

    vi.mocked(storage.searchByVector).mockResolvedValue([
      {
        memory: {
          id: 'existing-id',
          content: 'nearly identical content',
          embedding: [0.1, 0.2, 0.3],
          metadata: { sessionId: 's0', source: 'manual' },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
        },
        score: 0.92,
        matchType: 'vector',
      },
    ])

    const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
    const result = await useCase.saveManual({
      content: 'nearly identical content!',
      sessionId: 'session-1',
    })

    expect(result.saved).toBe(false)
    expect(storage.save).not.toHaveBeenCalled()
  })

  it('should save when existing memory similarity is below threshold', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()

    vi.mocked(storage.searchByVector).mockResolvedValue([
      {
        memory: {
          id: 'existing-id',
          content: 'somewhat related content',
          embedding: [0.1, 0.2, 0.3],
          metadata: { sessionId: 's0', source: 'manual' },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
        },
        score: 0.8,
        matchType: 'vector',
      },
    ])

    const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
    await useCase.saveManual({
      content: 'different content',
      sessionId: 'session-1',
    })

    expect(storage.save).toHaveBeenCalledTimes(1)
  })

  it('should check duplicates in parallel (not sequentially)', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()

    vi.mocked(chunking.chunk).mockReturnValue([
      { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
      { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
      { content: 'chunk3', metadata: { sessionId: 's1', source: 'auto' as const } },
    ])
    vi.mocked(embedding.embedBatch).mockResolvedValue([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
      [0.7, 0.8, 0.9],
    ])
    vi.mocked(storage.searchByVector).mockResolvedValue([])

    const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
    const log = {
      sessionId: 's1',
      messages: [
        { role: 'user' as const, content: 'q', timestamp: new Date() },
        { role: 'assistant' as const, content: 'a', timestamp: new Date() },
      ],
    }
    await useCase.saveConversation(log)

    // All 3 dedup checks should have been made
    expect(storage.searchByVector).toHaveBeenCalledTimes(3)
    // All 3 non-duplicate chunks should be saved
    const saved = vi.mocked(storage.saveBatch).mock.calls[0]![0]
    expect(saved).toHaveLength(3)
  })

  describe('capacity management', () => {
    it('should auto-prune when total exceeds maxMemories on saveManual', async () => {
      const storage = createMockStorage()
      const embedding = createMockEmbedding()
      const chunking = createMockChunking()
      vi.mocked(storage.searchByVector).mockResolvedValue([])
      vi.mocked(storage.countAll).mockResolvedValue(10000)
      vi.mocked(storage.deleteLeastAccessed).mockResolvedValue(1)
      const useCase = defineSaveMemoryUseCase(storage, embedding, chunking, { maxMemories: 10000 })

      await useCase.saveManual({ content: 'new', sessionId: 's1' })

      expect(storage.countAll).toHaveBeenCalled()
      expect(storage.deleteLeastAccessed).toHaveBeenCalledWith(1)
      expect(storage.save).toHaveBeenCalled()
    })

    it('should not prune when under capacity', async () => {
      const storage = createMockStorage()
      const embedding = createMockEmbedding()
      const chunking = createMockChunking()
      vi.mocked(storage.searchByVector).mockResolvedValue([])
      vi.mocked(storage.countAll).mockResolvedValue(100)
      const useCase = defineSaveMemoryUseCase(storage, embedding, chunking, { maxMemories: 10000 })

      await useCase.saveManual({ content: 'new', sessionId: 's1' })

      expect(storage.deleteLeastAccessed).not.toHaveBeenCalled()
      expect(storage.save).toHaveBeenCalled()
    })

    it('should auto-prune excess when batch saving exceeds capacity', async () => {
      const storage = createMockStorage()
      const embedding = createMockEmbedding()
      const chunking = createMockChunking()
      vi.mocked(chunking.chunk).mockReturnValue([
        { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
        { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
      ])
      vi.mocked(embedding.embedBatch).mockResolvedValue([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ])
      vi.mocked(storage.searchByVector).mockResolvedValue([])
      vi.mocked(storage.countAll).mockResolvedValue(9999)
      vi.mocked(storage.deleteLeastAccessed).mockResolvedValue(1)
      const useCase = defineSaveMemoryUseCase(storage, embedding, chunking, { maxMemories: 10000 })

      const log = {
        sessionId: 's1',
        messages: [
          { role: 'user' as const, content: 'q', timestamp: new Date() },
          { role: 'assistant' as const, content: 'a', timestamp: new Date() },
        ],
      }
      await useCase.saveConversation(log)

      // 9999 + 2 new = 10001, need to delete 1
      expect(storage.deleteLeastAccessed).toHaveBeenCalledWith(1)
    })

    it('should skip capacity check when maxMemories is 0 (disabled)', async () => {
      const storage = createMockStorage()
      const embedding = createMockEmbedding()
      const chunking = createMockChunking()
      vi.mocked(storage.searchByVector).mockResolvedValue([])
      const useCase = defineSaveMemoryUseCase(storage, embedding, chunking, { maxMemories: 0 })

      await useCase.saveManual({ content: 'new', sessionId: 's1' })

      expect(storage.countAll).not.toHaveBeenCalled()
      expect(storage.deleteLeastAccessed).not.toHaveBeenCalled()
    })
  })

  describe('embedding validation', () => {
    it('should skip embeddings with wrong dimension count', async () => {
      const storage = createMockStorage()
      const embedding = createMockEmbedding()
      const chunking = createMockChunking()
      vi.mocked(chunking.chunk).mockReturnValue([
        { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
        { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
      ])
      // getDimension returns 3, but first embedding has 2 dimensions (wrong)
      vi.mocked(embedding.embedBatch).mockResolvedValue([
        [0.1, 0.2],
        [0.4, 0.5, 0.6],
      ])
      vi.mocked(storage.searchByVector).mockResolvedValue([])

      const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
      const log: ConversationLog = {
        sessionId: 's1',
        messages: [
          { role: 'user', content: 'q1', timestamp: new Date() },
          { role: 'assistant', content: 'a1', timestamp: new Date() },
        ],
      }

      await useCase.saveConversation(log)
      const savedMemories = vi.mocked(storage.saveBatch).mock.calls[0]![0]
      expect(savedMemories).toHaveLength(1)
      expect(savedMemories[0]!.content).toBe('chunk2')
    })

    it('should skip embeddings containing NaN values', async () => {
      const storage = createMockStorage()
      const embedding = createMockEmbedding()
      const chunking = createMockChunking()
      vi.mocked(chunking.chunk).mockReturnValue([
        { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
        { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
      ])
      vi.mocked(embedding.getDimension).mockReturnValue(3)
      vi.mocked(embedding.embedBatch).mockResolvedValue([
        [0.1, Number.NaN, 0.3],
        [0.4, 0.5, 0.6],
      ])
      vi.mocked(storage.searchByVector).mockResolvedValue([])

      const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
      const log: ConversationLog = {
        sessionId: 's1',
        messages: [
          { role: 'user', content: 'q1', timestamp: new Date() },
          { role: 'assistant', content: 'a1', timestamp: new Date() },
        ],
      }

      await useCase.saveConversation(log)
      const savedMemories = vi.mocked(storage.saveBatch).mock.calls[0]![0]
      expect(savedMemories).toHaveLength(1)
      expect(savedMemories[0]!.content).toBe('chunk2')
    })

    it('should skip embeddings containing Infinity values', async () => {
      const storage = createMockStorage()
      const embedding = createMockEmbedding()
      const chunking = createMockChunking()
      vi.mocked(chunking.chunk).mockReturnValue([
        { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
        { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
      ])
      vi.mocked(embedding.getDimension).mockReturnValue(3)
      vi.mocked(embedding.embedBatch).mockResolvedValue([
        [0.1, Number.POSITIVE_INFINITY, 0.3],
        [0.4, 0.5, 0.6],
      ])
      vi.mocked(storage.searchByVector).mockResolvedValue([])

      const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
      const log: ConversationLog = {
        sessionId: 's1',
        messages: [
          { role: 'user', content: 'q1', timestamp: new Date() },
          { role: 'assistant', content: 'a1', timestamp: new Date() },
        ],
      }

      await useCase.saveConversation(log)
      const savedMemories = vi.mocked(storage.saveBatch).mock.calls[0]![0]
      expect(savedMemories).toHaveLength(1)
      expect(savedMemories[0]!.content).toBe('chunk2')
    })

    it('should skip embeddings containing -Infinity values', async () => {
      const storage = createMockStorage()
      const embedding = createMockEmbedding()
      const chunking = createMockChunking()
      vi.mocked(chunking.chunk).mockReturnValue([
        { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
        { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
      ])
      vi.mocked(embedding.getDimension).mockReturnValue(3)
      vi.mocked(embedding.embedBatch).mockResolvedValue([
        [0.4, 0.5, 0.6],
        [0.1, Number.NEGATIVE_INFINITY, 0.3],
      ])
      vi.mocked(storage.searchByVector).mockResolvedValue([])

      const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
      const log: ConversationLog = {
        sessionId: 's1',
        messages: [
          { role: 'user', content: 'q1', timestamp: new Date() },
          { role: 'assistant', content: 'a1', timestamp: new Date() },
        ],
      }

      await useCase.saveConversation(log)
      const savedMemories = vi.mocked(storage.saveBatch).mock.calls[0]![0]
      expect(savedMemories).toHaveLength(1)
      expect(savedMemories[0]!.content).toBe('chunk1')
    })

    it('should skip all invalid embeddings and not call saveBatch', async () => {
      const storage = createMockStorage()
      const embedding = createMockEmbedding()
      const chunking = createMockChunking()
      vi.mocked(chunking.chunk).mockReturnValue([
        { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
      ])
      vi.mocked(embedding.getDimension).mockReturnValue(3)
      vi.mocked(embedding.embedBatch).mockResolvedValue([[0.1, Number.NaN, 0.3]])
      vi.mocked(storage.searchByVector).mockResolvedValue([])

      const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
      const log: ConversationLog = {
        sessionId: 's1',
        messages: [
          { role: 'user', content: 'q1', timestamp: new Date() },
          { role: 'assistant', content: 'a1', timestamp: new Date() },
        ],
      }

      await useCase.saveConversation(log)
      expect(storage.saveBatch).not.toHaveBeenCalled()
    })
  })

  it('should skip duplicate chunks during conversation save', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()

    vi.mocked(chunking.chunk).mockReturnValue([
      { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
      { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
    ])
    vi.mocked(embedding.embedBatch).mockResolvedValue([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ])

    // First chunk: duplicate exists. Second chunk: no duplicate.
    vi.mocked(storage.searchByVector)
      .mockResolvedValueOnce([
        {
          memory: {
            id: 'dup',
            content: 'chunk1 dup',
            embedding: [0.1, 0.2, 0.3],
            metadata: { sessionId: 's0', source: 'auto' },
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: 0,
          },
          score: 0.97,
          matchType: 'vector',
        },
      ])
      .mockResolvedValueOnce([])

    const useCase = defineSaveMemoryUseCase(storage, embedding, chunking)
    const log = {
      sessionId: 's1',
      messages: [
        { role: 'user' as const, content: 'q', timestamp: new Date() },
        { role: 'assistant' as const, content: 'a', timestamp: new Date() },
      ],
    }
    await useCase.saveConversation(log)

    const savedMemories = vi.mocked(storage.saveBatch).mock.calls[0]![0]
    expect(savedMemories).toHaveLength(1)
    expect(savedMemories[0]!.content).toBe('chunk2')
  })
})
