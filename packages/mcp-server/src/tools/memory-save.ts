import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Container } from '../container.js'

export function registerMemorySaveTool(server: McpServer, container: Container): void {
  server.tool(
    'memory_save',
    'Save a manual memory entry',
    {
      content: z.string().min(1),
      sessionId: z.string(),
      projectPath: z.string().optional(),
      tags: z.array(z.string()).optional(),
    },
    async (args) => {
      await container.saveMemory.saveManual(args)
      return {
        content: [{ type: 'text', text: 'Memory saved successfully.' }],
      }
    },
  )
}
