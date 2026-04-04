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
      const result = await container.saveMemory.saveManual(args)
      const text = result.saved ? 'Memory saved successfully.' : 'Duplicate memory skipped.'
      return {
        content: [{ type: 'text', text }],
      }
    },
  )
}
