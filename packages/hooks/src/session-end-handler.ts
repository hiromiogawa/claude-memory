import { readFileSync } from 'node:fs'
import type { ChunkingStrategy, ConversationLog, ConversationMessage } from '@claude-memory/core'

interface SaveConversationCapable {
  saveConversation(log: ConversationLog): Promise<void>
}

interface RawLogEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export class SessionEndHandler {
  constructor(
    private readonly chunking: ChunkingStrategy,
    private readonly saveUseCase: SaveConversationCapable,
  ) {}

  async handle(
    conversationLogPath: string,
    sessionId: string,
    projectPath?: string,
  ): Promise<void> {
    const messages = this.parseLog(conversationLogPath)
    const log: ConversationLog = { sessionId, projectPath, messages }
    await this.saveUseCase.saveConversation(log)
  }

  private parseLog(filePath: string): ConversationMessage[] {
    const content = readFileSync(filePath, 'utf-8').trim()
    if (!content) return []

    const messages: ConversationMessage[] = []
    for (const line of content.split('\n')) {
      try {
        const entry = JSON.parse(line) as RawLogEntry
        if (entry.role && entry.content) {
          messages.push({
            role: entry.role,
            content: entry.content,
            timestamp: new Date(entry.timestamp),
          })
        }
      } catch {
        // skip malformed lines
      }
    }
    return messages
  }
}
