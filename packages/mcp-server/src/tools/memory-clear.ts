import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'
import { TOOL_METADATA } from './tool-metadata.js'

const meta = TOOL_METADATA.find((t) => t.name === 'memory_clear')!

/**
 * memory_clearツールをMCP serverに登録する。
 * @param server - MCP serverインスタンス
 * @param container - DIコンテナ
 * @param logger - Pinoロガーインスタンス
 */
export function registerMemoryClearTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(meta.name, meta.description, async () => {
    return handleToolError(async () => {
      const start = performance.now()
      await container.clearMemory.execute()
      const durationMs = Math.round(performance.now() - start)
      logger.info({ tool: 'memory_clear', durationMs }, 'memory_clear completed')
      return {
        content: [{ type: 'text', text: 'All memories cleared.' }],
      }
    }, logger)
  })
}
