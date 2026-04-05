import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

export function registerMemoryExportTool(server: McpServer, container: Container): void {
  server.tool('memory_export', 'Export all memories as JSON for backup', async () => {
    return handleToolError(async () => {
      const data = await container.exportMemory.execute()
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      }
    })
  })
}
