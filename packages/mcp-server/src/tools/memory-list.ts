import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Container } from '../container.js'

export function registerMemoryListTool(server: McpServer, container: Container): void {
  server.tool(
    'memory_list',
    'List memories with pagination',
    {
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
      source: z.enum(['manual', 'auto']).optional(),
      tags: z.array(z.string()).optional(),
    },
    async (args) => {
      const memories = await container.listMemories.execute({
        limit: args.limit,
        offset: args.offset,
        source: args.source,
        tags: args.tags,
      })

      if (memories.length === 0) {
        return {
          content: [{ type: 'text', text: 'No memories found.' }],
        }
      }

      const formatted = memories
        .map((m, i) => {
          const lines = [
            `[${i + 1}] id=${m.id} source=${m.metadata.source} createdAt=${m.createdAt.toISOString()}`,
            m.content,
          ]
          return lines.join('\n')
        })
        .join('\n\n')

      return {
        content: [{ type: 'text', text: formatted }],
      }
    },
  )
}
