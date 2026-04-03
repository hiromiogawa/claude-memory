export class MemoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'MemoryError'
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super(`Memory not found: ${id}`, 'MEMORY_NOT_FOUND')
    this.name = 'MemoryNotFoundError'
  }
}

export class EmbeddingFailedError extends MemoryError {
  constructor(reason: string) {
    super(`Embedding failed: ${reason}`, 'EMBEDDING_FAILED')
    this.name = 'EmbeddingFailedError'
  }
}

export class StorageConnectionError extends MemoryError {
  constructor(reason: string) {
    super(`Storage connection error: ${reason}`, 'STORAGE_CONNECTION_ERROR')
    this.name = 'StorageConnectionError'
  }
}
