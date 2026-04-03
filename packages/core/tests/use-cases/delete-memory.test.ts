import { describe, expect, it, vi } from 'vitest'
import { MemoryNotFoundError } from '../../src/errors/memory-error.js'
import { DeleteMemoryUseCase } from '../../src/use-cases/delete-memory.js'

describe('DeleteMemoryUseCase', () => {
  it('should delete an existing memory', async () => {
    const storage = { findById: vi.fn().mockResolvedValue({ id: '1' }), delete: vi.fn() } as any
    const useCase = new DeleteMemoryUseCase(storage)
    await useCase.execute('1')
    expect(storage.delete).toHaveBeenCalledWith('1')
  })

  it('should throw MemoryNotFoundError if memory does not exist', async () => {
    const storage = { findById: vi.fn().mockResolvedValue(null), delete: vi.fn() } as any
    const useCase = new DeleteMemoryUseCase(storage)
    await expect(useCase.execute('not-found')).rejects.toThrow(MemoryNotFoundError)
  })
})
