import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

export function registerMemoryStatsTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool('memory_stats', 'Get memory storage statistics', async () => {
    return handleToolError(async () => {
      const start = performance.now()
      const stats = await container.getStats.execute()
      const durationMs = Math.round(performance.now() - start)
      logger.info(
        { tool: 'memory_stats', durationMs, totalMemories: stats.totalMemories },
        'memory_stats completed',
      )

      const lines = [
        `Total memories: ${stats.totalMemories}`,
        `  Manual: ${stats.manualCount}`,
        `  Auto: ${stats.autoCount}`,
        `Total sessions: ${stats.totalSessions}`,
        `Oldest memory: ${stats.oldestMemory ? stats.oldestMemory.toISOString() : 'N/A'}`,
        `Newest memory: ${stats.newestMemory ? stats.newestMemory.toISOString() : 'N/A'}`,
        `Average content length: ${stats.averageContentLength.toFixed(1)} chars`,
        `Query time: ${durationMs}ms`,
      ]

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      }
    }, logger)
  })
}
