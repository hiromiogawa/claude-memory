import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

export function registerMemoryClearTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool('memory_clear', 'Clear all memories', async () => {
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
