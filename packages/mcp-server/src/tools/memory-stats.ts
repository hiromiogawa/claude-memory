import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Container } from '../container.js'

export function registerMemoryStatsTool(server: McpServer, container: Container): void {
  server.tool('memory_stats', 'Get memory storage statistics', async () => {
    const start = performance.now()
    const stats = await container.getStats.execute()
    const durationMs = Math.round(performance.now() - start)

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
  })
}
