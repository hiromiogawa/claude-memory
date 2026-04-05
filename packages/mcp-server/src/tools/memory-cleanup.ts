import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import { z } from 'zod'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

export function registerMemoryCleanupTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(
    'memory_cleanup',
    'Delete old memories that have not been accessed recently',
    {
      olderThanDays: z.number().min(1).describe('Delete memories not accessed in this many days'),
      dryRun: z
        .boolean()
        .optional()
        .default(true)
        .describe('Preview what would be deleted without actually deleting'),
    },
    async (args) => {
      return handleToolError(async () => {
        const start = performance.now()
        const result = await container.cleanupMemory.execute(args)
        const durationMs = Math.round(performance.now() - start)
        logger.info(
          {
            tool: 'memory_cleanup',
            durationMs,
            deletedCount: result.deletedCount,
            dryRun: result.dryRun,
          },
          'memory_cleanup completed',
        )
        const action = result.dryRun ? 'Would delete' : 'Deleted'
        return {
          content: [
            {
              type: 'text',
              text: `${action} ${result.deletedCount} memories (not accessed in ${args.olderThanDays} days).`,
            },
          ],
        }
      }, logger)
    },
  )
}
