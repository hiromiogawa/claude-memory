import { describe, expect, it, vi } from 'vitest'
import { defineGetStatsUseCase } from '../../src/use-cases/get-stats.js'

describe('GetStatsUseCase', () => {
  it('should return storage stats', async () => {
    const stats = {
      totalMemories: 42,
      totalSessions: 5,
      oldestMemory: null,
      newestMemory: null,
      averageContentLength: 150,
      manualCount: 30,
      autoCount: 12,
    }
    const storage = { getStats: vi.fn().mockResolvedValue(stats) } as any
    const useCase = defineGetStatsUseCase(storage)
    const result = await useCase.execute()
    expect(result).toEqual(stats)
  })
})
