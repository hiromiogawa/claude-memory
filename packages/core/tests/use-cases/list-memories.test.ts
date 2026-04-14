import { describe, expect, it, vi } from 'vitest'
import { defineListMemoriesUseCase } from '../../src/use-cases/list-memories.js'

describe('ListMemoriesUseCase', () => {
  it('should pass options to storage and return results', async () => {
    const memories = [{ id: '1' }, { id: '2' }]
    const storage = { list: vi.fn().mockResolvedValue(memories) } as any
    const useCase = defineListMemoriesUseCase(storage)
    const result = await useCase.execute({ limit: 20, offset: 0 })
    expect(storage.list).toHaveBeenCalledWith({ limit: 20, offset: 0 })
    expect(result).toEqual(memories)
  })

  it('should cap limit at 100', async () => {
    const storage = { list: vi.fn().mockResolvedValue([]) } as any
    const useCase = defineListMemoriesUseCase(storage)
    await useCase.execute({ limit: 200, offset: 0 })
    expect(storage.list).toHaveBeenCalledWith({ limit: 100, offset: 0 })
  })
})
