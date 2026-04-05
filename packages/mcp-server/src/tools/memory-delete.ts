import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import { z } from 'zod'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

export function registerMemoryDeleteTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(
    'memory_delete',
    'Delete a memory by ID',
    {
      id: z.string().uuid(),
    },
    async (args) => {
      return handleToolError(async () => {
        const start = performance.now()
        await container.deleteMemory.execute(args.id)
        const durationMs = Math.round(performance.now() - start)
        logger.info({ tool: 'memory_delete', durationMs, id: args.id }, 'memory_delete completed')
        return {
          content: [{ type: 'text', text: `Memory ${args.id} deleted.` }],
        }
      }, logger)
    },
  )
}
