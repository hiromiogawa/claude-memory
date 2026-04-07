import type { MemoryMetadata } from './memory.js'

/** 会話から抽出されたテキストセグメントとそのメタデータ。 */
export interface Chunk {
  /** チャンクのテキスト内容。 */
  content: string
  /** 元の会話から引き継いだメタデータ。 */
  metadata: MemoryMetadata
}
