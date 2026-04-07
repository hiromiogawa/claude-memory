import type { StorageRepository } from '../interfaces/storage-repository.js'

/** インポート/エクスポート用の記憶のポータブル表現。 */
export interface ExportedMemory {
  /** 記憶のテキスト内容。 */
  content: string
  /** 記憶に関連するメタデータ。 */
  metadata: {
    sessionId: string
    projectPath?: string
    tags?: string[]
    source: 'manual' | 'auto'
  }
  /** ISO 8601形式の作成タイムスタンプ。 */
  createdAt: string
}

/** 全記憶をポータブル形式（embeddingなし）でエクスポートする。 */
export class ExportMemoryUseCase {
  /**
   * 新しい ExportMemoryUseCase を生成する。
   * @param storage - エクスポート元のストレージリポジトリ。
   */
  constructor(private readonly storage: StorageRepository) {}

  /**
   * 全記憶をISO日付文字列のポータブルオブジェクトとしてエクスポートする。
   * @returns エクスポートされた記憶の配列。
   */
  async execute(): Promise<ExportedMemory[]> {
    const memories = await this.storage.exportAll()
    return memories.map((m) => ({
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
    }))
  }
}
