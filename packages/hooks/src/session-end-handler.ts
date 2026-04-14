import { readFileSync } from 'node:fs'
import type { ConversationLog, ConversationMessage } from '@claude-memory/core'

interface SaveConversationCapable {
  saveConversation(log: ConversationLog): Promise<void>
}

interface ContentBlock {
  type: string
  text?: string
}

interface RawLogEntry {
  type: string
  message?: {
    role: 'user' | 'assistant'
    content: string | ContentBlock[]
  }
  timestamp: string
}

/** セッション終了時に会話ログをQ&Aチャンクに変換してメモリとして保存するハンドラ。 */
export interface SessionEndHandler {
  /**
   * 会話ログファイルを読み込み、チャンク化してメモリとして保存する。
   * @param conversationLogPath - JSONL形式の会話ログファイルのパス
   * @param sessionId - セッションの一意識別子
   * @param projectPath - メモリのスコープを絞るプロジェクトパス（省略可）
   */
  handle(conversationLogPath: string, sessionId: string, projectPath?: string): Promise<void>
}

function parseLog(filePath: string): ConversationMessage[] {
  const content = readFileSync(filePath, 'utf-8').trim()
  if (!content) return []

  const messages: ConversationMessage[] = []
  for (const line of content.split('\n')) {
    try {
      const entry = JSON.parse(line) as RawLogEntry
      if (entry.type !== 'user' && entry.type !== 'assistant') continue
      if (!entry.message) continue

      const role = entry.message.role
      const rawContent = entry.message.content
      const text =
        typeof rawContent === 'string'
          ? rawContent
          : rawContent
              .filter((b) => b.type === 'text' && b.text)
              .map((b) => b.text)
              .join('\n')

      if (role && text) {
        messages.push({ role, content: text, timestamp: new Date(entry.timestamp) })
      }
    } catch {
      // skip malformed lines
    }
  }
  return messages
}

/**
 * セッション終了時ハンドラを生成する。
 *
 * チャンキングは `saveUseCase.saveConversation` 内部で行われるため、
 * ここでは ChunkingStrategy を受け取らない。
 * @param saveUseCase - 会話ログを永続化するユースケース
 */
export function defineSessionEndHandler(saveUseCase: SaveConversationCapable): SessionEndHandler {
  return {
    async handle(
      conversationLogPath: string,
      sessionId: string,
      projectPath?: string,
    ): Promise<void> {
      const messages = parseLog(conversationLogPath)
      const log: ConversationLog = { sessionId, projectPath, messages }
      await saveUseCase.saveConversation(log)
    },
  }
}
