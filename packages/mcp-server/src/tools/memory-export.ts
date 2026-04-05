import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

export function registerMemoryExportTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool('memory_export', 'Export all memories as JSON for backup', async () => {
    return handleToolError(async () => {
      const start = performance.now()
      const data = await container.exportMemory.execute()
      const durationMs = Math.round(performance.now() - start)
      logger.info(
        { tool: 'memory_export', durationMs, count: Array.isArray(data) ? data.length : 0 },
        'memory_export completed',
      )
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      }
    }, logger)
  })
}
