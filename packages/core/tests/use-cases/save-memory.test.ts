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
    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)

    await useCase.saveManual({
      content: 'test content',
      sessionId: 'session-1',
      projectPath: '/project',
    })

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
})
