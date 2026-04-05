import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

const exportedMemorySchema = z.array(
  z.object({
    content: z.string().min(1),
    metadata: z.object({
      sessionId: z.string(),
      projectPath: z.string().optional(),
      tags: z.array(z.string()).optional(),
      source: z.enum(['manual', 'auto']),
    }),
    createdAt: z.string(),
  }),
)

export function registerMemoryImportTool(server: McpServer, container: Container): void {
  server.tool(
    'memory_import',
    'Import memories from JSON backup (re-computes embeddings)',
    {
      data: z.string().min(1).describe('JSON string of exported memories array'),
    },
    async (args) => {
      return handleToolError(async () => {
        const parsed = exportedMemorySchema.parse(JSON.parse(args.data))
        const result = await container.importMemory.execute(parsed)
        return {
          content: [{ type: 'text', text: `Imported ${result.imported} memories.` }],
        }
      })
    },
  )
}
