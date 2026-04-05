import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import { z } from 'zod'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

export function registerMemoryUpdateTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
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
        const start = performance.now()
        await container.updateMemory.execute(args)
        const durationMs = Math.round(performance.now() - start)
        logger.info({ tool: 'memory_update', durationMs, id: args.id }, 'memory_update completed')
        return {
          content: [{ type: 'text', text: `Memory ${args.id} updated.` }],
        }
      }, logger)
    },
  )
}
