import { MemoryError } from '@claude-memory/core'
import type { Logger } from 'pino'

/** Structured MCP tool result compatible with MCP SDK CallToolResult */
export interface McpToolResult {
  [key: string]: unknown
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

/**
 * Wraps a tool handler to catch domain errors and return structured MCP error responses.
 * - Known domain errors (MemoryError subclasses) return user-friendly messages.
 * - Unknown errors are logged and return a generic internal error message.
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
