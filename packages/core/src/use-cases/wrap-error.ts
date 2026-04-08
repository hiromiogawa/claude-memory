import {
  EmbeddingFailedError,
  MemoryError,
  StorageConnectionError,
} from '../errors/memory-error.js'

/**
 * storage層の呼び出しをラップし、DB例外をStorageConnectionErrorに変換する。
 * 既にMemoryErrorのサブクラスであればそのまま再スローする。
 */
export async function wrapStorageError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof MemoryError) throw error
    const message = error instanceof Error ? error.message : 'Unknown storage error'
    throw new StorageConnectionError(message)
  }
}

/**
 * embedding層の呼び出しをラップし、例外をEmbeddingFailedErrorに変換する。
 * 既にMemoryErrorのサブクラスであればそのまま再スローする。
 */
export async function wrapEmbeddingError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof MemoryError) throw error
    const message = error instanceof Error ? error.message : 'Unknown embedding error'
    throw new EmbeddingFailedError(message)
  }
}
