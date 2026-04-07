import { MemoryError } from '@claude-memory/core'
import type { Logger } from 'pino'

/** MCP SDK CallToolResult互換の構造化されたMCPツール結果。 */
export interface McpToolResult {
  [key: string]: unknown
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

/**
 * ツールハンドラをラップしてドメインエラーを捕捉し、構造化されたMCPエラーレスポンスを返す。
 * - 既知のドメインエラー（MemoryErrorサブクラス）はユーザー向けメッセージを返す。
 * - 未知のエラーはログに記録し、汎用の内部エラーメッセージを返す。
 */
export async function handleToolError(
  fn: () => Promise<McpToolResult>,
  logger?: Logger,
): Promise<McpToolResult> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof MemoryError) {
      if (logger) {
        logger.error({ error: error.message }, 'tool error')
      }
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      }
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (logger) {
      logger.error({ error: message }, 'tool error')
    }
    return {
      content: [{ type: 'text', text: `Internal error: ${message}` }],
      isError: true,
    }
  }
}
