import { describe, expect, it, vi } from 'vitest'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import { defineCleanupMemoryUseCase } from '../../src/use-cases/cleanup-memory.js'

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
    countAll: vi.fn(),
    deleteLeastAccessed: vi.fn(),
  }
}

describe('CleanupMemoryUseCase', () => {
  it('should count memories in dry-run mode without deleting', async () => {
    const storage = createMockStorage()
    vi.mocked(storage.countOlderThan).mockResolvedValue(5)
    const useCase = defineCleanupMemoryUseCase(storage)

    const result = await useCase.execute({ olderThanDays: 30, dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.deletedCount).toBe(5)
    expect(storage.countOlderThan).toHaveBeenCalledWith('lastAccessedAt', 30)
    expect(storage.deleteOlderThan).not.toHaveBeenCalled()
  })

  it('should delete old memories when not in dry-run mode', async () => {
    const storage = createMockStorage()
    vi.mocked(storage.deleteOlderThan).mockResolvedValue(3)
    const useCase = defineCleanupMemoryUseCase(storage)

    const result = await useCase.execute({ olderThanDays: 60, dryRun: false })

    expect(result.dryRun).toBe(false)
    expect(result.deletedCount).toBe(3)
    expect(storage.deleteOlderThan).toHaveBeenCalledWith('lastAccessedAt', 60)
    expect(storage.countOlderThan).not.toHaveBeenCalled()
  })

  it('should default to dry-run when dryRun is undefined', async () => {
    const storage = createMockStorage()
    vi.mocked(storage.countOlderThan).mockResolvedValue(0)
    const useCase = defineCleanupMemoryUseCase(storage)

    const result = await useCase.execute({ olderThanDays: 90 })

    expect(result.dryRun).toBe(true)
    expect(storage.countOlderThan).toHaveBeenCalled()
    expect(storage.deleteOlderThan).not.toHaveBeenCalled()
  })

  describe('LFU cleanup (strategy: leastAccessed)', () => {
    it('should delete least accessed memories with given limit', async () => {
      const storage = createMockStorage()
      vi.mocked(storage.deleteLeastAccessed).mockResolvedValue(10)
      const useCase = defineCleanupMemoryUseCase(storage)

      const result = await useCase.execute({
        strategy: 'leastAccessed',
        limit: 10,
        dryRun: false,
      })

      expect(result.deletedCount).toBe(10)
      expect(result.dryRun).toBe(false)
      expect(storage.deleteLeastAccessed).toHaveBeenCalledWith(10)
    })

    it('should return count in dry-run mode for leastAccessed', async () => {
      const storage = createMockStorage()
      vi.mocked(storage.countAll).mockResolvedValue(500)
      const useCase = defineCleanupMemoryUseCase(storage)

      const result = await useCase.execute({
        strategy: 'leastAccessed',
        limit: 100,
        dryRun: true,
      })

      expect(result.deletedCount).toBe(100)
      expect(result.dryRun).toBe(true)
      expect(storage.deleteLeastAccessed).not.toHaveBeenCalled()
    })

    it('should cap dry-run count to total memories when limit exceeds total', async () => {
      const storage = createMockStorage()
      vi.mocked(storage.countAll).mockResolvedValue(50)
      const useCase = defineCleanupMemoryUseCase(storage)

      const result = await useCase.execute({
        strategy: 'leastAccessed',
        limit: 100,
        dryRun: true,
      })

      expect(result.deletedCount).toBe(50)
    })
  })

  describe('lastAccessedOlderThan strategy', () => {
    it('should delete memories not accessed in N days', async () => {
      const storage = createMockStorage()
      vi.mocked(storage.deleteOlderThan).mockResolvedValue(7)
      const useCase = defineCleanupMemoryUseCase(storage)

      const result = await useCase.execute({
        strategy: 'lastAccessedOlderThan',
        olderThanDays: 30,
        dryRun: false,
      })

      expect(result.deletedCount).toBe(7)
      expect(storage.deleteOlderThan).toHaveBeenCalledWith('lastAccessedAt', 30)
    })

    it('should count in dry-run for lastAccessedOlderThan', async () => {
      const storage = createMockStorage()
      vi.mocked(storage.countOlderThan).mockResolvedValue(12)
      const useCase = defineCleanupMemoryUseCase(storage)

      const result = await useCase.execute({
        strategy: 'lastAccessedOlderThan',
        olderThanDays: 60,
        dryRun: true,
      })

      expect(result.deletedCount).toBe(12)
      expect(result.dryRun).toBe(true)
      expect(storage.countOlderThan).toHaveBeenCalledWith('lastAccessedAt', 60)
    })
  })
})
