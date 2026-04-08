/** 記憶関連エラーの基底クラス。 */
export class MemoryError extends Error {
  /**
   * 新しい MemoryError を生成する。
   * @param message - 人間が読めるエラーの説明。
   * @param code - マシンが読めるエラーコード。
   * @param options - ErrorOptions（cause など）。
   */
  constructor(
    message: string,
    public readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'MemoryError'
  }
}

/** 指定IDの記憶が存在しない場合にスローされる。 */
export class MemoryNotFoundError extends MemoryError {
  /**
   * 新しい MemoryNotFoundError を生成する。
   * @param id - 見つからなかった記憶のUUID。
   */
  constructor(id: string) {
    super(`Memory not found: ${id}`, 'MEMORY_NOT_FOUND')
    this.name = 'MemoryNotFoundError'
  }
}

/** embedding vectorの生成に失敗した場合にスローされる。 */
export class EmbeddingFailedError extends MemoryError {
  /**
   * 新しい EmbeddingFailedError を生成する。
   * @param reason - embedding失敗の理由の説明。
   * @param options - ErrorOptions（cause など）。
   */
  constructor(reason: string, options?: ErrorOptions) {
    super(`Embedding failed: ${reason}`, 'EMBEDDING_FAILED', options)
    this.name = 'EmbeddingFailedError'
  }
}

/** ストレージバックエンドへの接続に失敗した場合にスローされる。 */
export class StorageConnectionError extends MemoryError {
  /**
   * 新しい StorageConnectionError を生成する。
   * @param reason - 接続失敗の理由の説明。
   * @param options - ErrorOptions（cause など）。
   */
  constructor(reason: string, options?: ErrorOptions) {
    super(`Storage connection error: ${reason}`, 'STORAGE_CONNECTION_ERROR', options)
    this.name = 'StorageConnectionError'
  }
}
