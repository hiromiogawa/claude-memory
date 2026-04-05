import { describe, expect, it, vi } from 'vitest'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import { CleanupMemoryUseCase } from '../../src/use-cases/cleanup-memory.js'

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
    deleteOlderThan: vi.fn(),
    countOlderThan: vi.fn(),
  }
}

describe('CleanupMemoryUseCase', () => {
  it('should count memories in dry-run mode without deleting', async () => {
    const storage = createMockStorage()
    vi.mocked(storage.countOlderThan).mockResolvedValue(5)
    const useCase = new CleanupMemoryUseCase(storage)

    const result = await useCase.execute({ olderThanDays: 30, dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.deletedCount).toBe(5)
    expect(storage.countOlderThan).toHaveBeenCalledWith('lastAccessedAt', 30)
    expect(storage.deleteOlderThan).not.toHaveBeenCalled()
  })

  it('should delete old memories when not in dry-run mode', async () => {
    const storage = createMockStorage()
    vi.mocked(storage.deleteOlderThan).mockResolvedValue(3)
    const useCase = new CleanupMemoryUseCase(storage)

    const result = await useCase.execute({ olderThanDays: 60, dryRun: false })

    expect(result.dryRun).toBe(false)
    expect(result.deletedCount).toBe(3)
    expect(storage.deleteOlderThan).toHaveBeenCalledWith('lastAccessedAt', 60)
    expect(storage.countOlderThan).not.toHaveBeenCalled()
  })

  it('should default to dry-run when dryRun is undefined', async () => {
    const storage = createMockStorage()
    vi.mocked(storage.countOlderThan).mockResolvedValue(0)
    const useCase = new CleanupMemoryUseCase(storage)

    const result = await useCase.execute({ olderThanDays: 90 })

    expect(result.dryRun).toBe(true)
    expect(storage.countOlderThan).toHaveBeenCalled()
    expect(storage.deleteOlderThan).not.toHaveBeenCalled()
  })
})
