/** Base error class for all memory-related errors. */
export class MemoryError extends Error {
  /**
   * Creates a new MemoryError.
   * @param message - Human-readable error description.
   * @param code - Machine-readable error code.
   */
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'MemoryError'
  }
}

/** Thrown when a memory with the specified ID does not exist. */
export class MemoryNotFoundError extends MemoryError {
  /**
   * Creates a new MemoryNotFoundError.
   * @param id - The UUID of the memory that was not found.
   */
  constructor(id: string) {
    super(`Memory not found: ${id}`, 'MEMORY_NOT_FOUND')
    this.name = 'MemoryNotFoundError'
  }
}

/** Thrown when generating an embedding vector fails. */
export class EmbeddingFailedError extends MemoryError {
  /**
   * Creates a new EmbeddingFailedError.
   * @param reason - Description of why embedding failed.
   */
  constructor(reason: string) {
    super(`Embedding failed: ${reason}`, 'EMBEDDING_FAILED')
    this.name = 'EmbeddingFailedError'
  }
}

/** Thrown when the storage backend connection fails. */
export class StorageConnectionError extends MemoryError {
  /**
   * Creates a new StorageConnectionError.
   * @param reason - Description of the connection failure.
   */
  constructor(reason: string) {
    super(`Storage connection error: ${reason}`, 'STORAGE_CONNECTION_ERROR')
    this.name = 'StorageConnectionError'
  }
}
