import { describe, expect, it, vi } from 'vitest'
import { ClearMemoryUseCase } from '../../src/use-cases/clear-memory.js'

describe('ClearMemoryUseCase', () => {
  it('should call storage.clear()', async () => {
    const storage = { clear: vi.fn() } as any
    const useCase = new ClearMemoryUseCase(storage)
    await useCase.execute()
    expect(storage.clear).toHaveBeenCalledTimes(1)
  })
})
