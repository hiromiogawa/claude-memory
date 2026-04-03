import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Container } from '../container.js'

export function registerMemoryDeleteTool(server: McpServer, container: Container): void {
  server.tool(
    'memory_delete',
    'Delete a memory by ID',
    {
      id: z.string().uuid(),
    },
    async (args) => {
      await container.deleteMemory.execute(args.id)
      return {
        content: [{ type: 'text', text: `Memory ${args.id} deleted.` }],
      }
    },
  )
}
