import { describe, expect, it, vi } from 'vitest'
import type { ConversationLog } from '../../src/entities/conversation.js'
import type { ChunkingStrategy } from '../../src/interfaces/chunking-strategy.js'
import type { EmbeddingProvider } from '../../src/interfaces/embedding-provider.js'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import { SaveMemoryUseCase } from '../../src/use-cases/save-memory.js'

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
  }
}

function createMockEmbedding(): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    embedBatch: vi.fn().mockResolvedValue([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]),
    getDimension: vi.fn().mockReturnValue(384),
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
    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)

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
    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)

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
    vi.mocked(embedding.embedBatch).mockResolvedValue([[0.1, 0.2], []])
    vi.mocked(storage.searchByVector).mockResolvedValue([])

    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
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
        },
        score: 0.96,
        matchType: 'vector',
      },
    ])

    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
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

    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
    await useCase.saveManual({
      content: 'unique content',
      sessionId: 'session-1',
    })

    expect(storage.save).toHaveBeenCalledTimes(1)
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
        },
        score: 0.8,
        matchType: 'vector',
      },
    ])

    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
    await useCase.saveManual({
      content: 'different content',
      sessionId: 'session-1',
    })

    expect(storage.save).toHaveBeenCalledTimes(1)
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
          },
          score: 0.97,
          matchType: 'vector',
        },
      ])
      .mockResolvedValueOnce([])

    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
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
