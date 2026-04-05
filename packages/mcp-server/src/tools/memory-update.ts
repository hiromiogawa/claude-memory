import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

export function registerMemoryUpdateTool(server: McpServer, container: Container): void {
  server.tool(
    'memory_update',
    'Update an existing memory (content and/or tags)',
    {
      id: z.string().uuid(),
      content: z.string().min(1).optional(),
      tags: z.array(z.string()).optional(),
    },
    async (args) => {
      return handleToolError(async () => {
        await container.updateMemory.execute(args)
        return {
          content: [{ type: 'text', text: `Memory ${args.id} updated.` }],
        }
      })
    },
  )
}
