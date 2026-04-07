import type { StorageRepository } from '../interfaces/storage-repository.js'

/** ストレージ内の全記憶を削除する。 */
export class ClearMemoryUseCase {
  /**
   * 新しい ClearMemoryUseCase を生成する。
   * @param storage - 操作対象のストレージリポジトリ。
   */
  constructor(private readonly storage: StorageRepository) {}
  /**
   * 全保存済み記憶を削除するクリア操作を実行する。
   * @returns 全記憶が削除されたときに解決する。
   */
  async execute(): Promise<void> {
    await this.storage.clear()
  }
}
