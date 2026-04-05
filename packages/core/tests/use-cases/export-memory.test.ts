import { describe, expect, it, vi } from 'vitest'
import { ExportMemoryUseCase } from '../../src/use-cases/export-memory.js'

describe('ExportMemoryUseCase', () => {
  it('should export all memories without embeddings', async () => {
    const memories = [
      {
        id: '1',
        content: 'test content',
        embedding: null,
        metadata: { sessionId: 's1', source: 'manual' as const },
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ]
    const storage = { exportAll: vi.fn().mockResolvedValue(memories) } as any
    const useCase = new ExportMemoryUseCase(storage)
    const result = await useCase.execute()
    expect(result).toHaveLength(1)
    expect(result[0]!.content).toBe('test content')
    expect(result[0]!.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect((result[0] as any).embedding).toBeUndefined()
  })
})
