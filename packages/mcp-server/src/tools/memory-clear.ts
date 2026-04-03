import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Container } from '../container.js'

export function registerMemoryClearTool(server: McpServer, container: Container): void {
  server.tool('memory_clear', 'Clear all memories', async () => {
    await container.clearMemory.execute()
    return {
      content: [{ type: 'text', text: 'All memories cleared.' }],
    }
  })
}
