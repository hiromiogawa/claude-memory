import { describe, expect, it, vi } from 'vitest'
import { defineImportMemoryUseCase } from '../../src/use-cases/import-memory.js'

describe('ImportMemoryUseCase', () => {
  it('should import memories with re-computed embeddings', async () => {
    const storage = { save: vi.fn() } as any
    const embedding = { embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]) } as any
    const useCase = defineImportMemoryUseCase(storage, embedding)

    const data = [
      {
        content: 'imported content',
        metadata: { sessionId: 's1', source: 'manual' as const },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    const result = await useCase.execute(data)
    expect(result.imported).toBe(1)
    expect(embedding.embed).toHaveBeenCalledWith('imported content')
    expect(storage.save).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(storage.save).mock.calls[0]![0]
    expect(saved.embedding).toEqual([0.1, 0.2, 0.3])
    expect(saved.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'))
  })
})
