import { describe, expect, it } from 'vitest'
import {
  EmbeddingFailedError,
  MemoryNotFoundError,
  StorageConnectionError,
} from '../../src/errors/memory-error.js'
import { wrapEmbeddingError, wrapStorageError } from '../../src/use-cases/wrap-error.js'

describe('wrapStorageError', () => {
  it('returns the result on success', async () => {
    const result = await wrapStorageError(async () => 'ok')
    expect(result).toBe('ok')
  })

  it('wraps generic Error into StorageConnectionError', async () => {
    await expect(
      wrapStorageError(async () => {
        throw new Error('connection refused')
      }),
    ).rejects.toThrow(StorageConnectionError)
  })

  it('preserves StorageConnectionError message', async () => {
    await expect(
      wrapStorageError(async () => {
        throw new Error('timeout')
      }),
    ).rejects.toThrow('Storage connection error: timeout')
  })

  it('re-throws MemoryError subclasses as-is', async () => {
    await expect(
      wrapStorageError(async () => {
        throw new MemoryNotFoundError('abc')
      }),
    ).rejects.toThrow(MemoryNotFoundError)
  })

  it('wraps non-Error throws into StorageConnectionError', async () => {
    await expect(
      wrapStorageError(async () => {
        throw 'string error'
      }),
    ).rejects.toThrow(StorageConnectionError)
  })

  it('preserves original error as cause', async () => {
    const original = new Error('connection refused')
    const wrapped = wrapStorageError(async () => {
      throw original
    })
    await expect(wrapped).rejects.toSatisfy((err: StorageConnectionError) => err.cause === original)
  })

  it('preserves non-Error cause', async () => {
    const wrapped = wrapStorageError(async () => {
      throw 'string error'
    })
    await expect(wrapped).rejects.toSatisfy(
      (err: StorageConnectionError) => err.cause === 'string error',
    )
  })
})

describe('wrapEmbeddingError', () => {
  it('returns the result on success', async () => {
    const result = await wrapEmbeddingError(async () => [0.1, 0.2])
    expect(result).toEqual([0.1, 0.2])
  })

  it('wraps generic Error into EmbeddingFailedError', async () => {
    await expect(
      wrapEmbeddingError(async () => {
        throw new Error('ONNX runtime failed')
      }),
    ).rejects.toThrow(EmbeddingFailedError)
  })

  it('re-throws MemoryError subclasses as-is', async () => {
    await expect(
      wrapEmbeddingError(async () => {
        throw new MemoryNotFoundError('abc')
      }),
    ).rejects.toThrow(MemoryNotFoundError)
  })

  it('preserves original error as cause', async () => {
    const original = new Error('ONNX runtime failed')
    const wrapped = wrapEmbeddingError(async () => {
      throw original
    })
    await expect(wrapped).rejects.toSatisfy((err: EmbeddingFailedError) => err.cause === original)
  })
})
