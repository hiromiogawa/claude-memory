import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Container } from '../container.js'

export function registerMemoryImportTool(server: McpServer, container: Container): void {
  server.tool(
    'memory_import',
    'Import memories from JSON backup (re-computes embeddings)',
    {
      data: z.string().min(1).describe('JSON string of exported memories array'),
    },
    async (args) => {
      const parsed = JSON.parse(args.data)
      const result = await container.importMemory.execute(parsed)
      return {
        content: [{ type: 'text', text: `Imported ${result.imported} memories.` }],
      }
    },
  )
}
