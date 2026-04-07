import type { Chunk } from '../entities/chunk.js'
import type { ConversationLog } from '../entities/conversation.js'

/** 会話をストレージ用のチャンクに分割するストラテジー。 */
export interface ChunkingStrategy {
  /**
   * 会話を保存用の個別チャンクに分割する。
   * @param conversation - チャンク化する会話ログ。
   * @returns 会話から抽出されたチャンクの配列。
   */
  chunk(conversation: ConversationLog): Chunk[]
}
