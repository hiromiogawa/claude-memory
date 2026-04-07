import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'
import { memoryCleanupSchema, TOOL_METADATA } from './tool-metadata.js'

const meta = TOOL_METADATA.find((t) => t.name === 'memory_cleanup')!

/**
 * memory_cleanupツールをMCP serverに登録する。
 * @param server - MCP serverインスタンス
 * @param container - DIコンテナ
 * @param logger - Pinoロガーインスタンス
 */
export function registerMemoryCleanupTool(
  server: McpServer,
  container: Container,
  logger?: Logger,
): void {
  server.tool(meta.name, meta.description, memoryCleanupSchema, async (args) => {
    return handleToolError(async () => {
      const start = performance.now()

      const strategy = args.strategy ?? 'lastAccessedOlderThan'

      let cleanupArgs: Parameters<typeof container.cleanupMemory.execute>[0]
      if (strategy === 'leastAccessed') {
        if (!args.limit) {
          return {
            content: [
              { type: 'text', text: 'Error: limit is required for leastAccessed strategy' },
            ],
            isError: true,
          }
        }
        cleanupArgs = { strategy: 'leastAccessed', limit: args.limit, dryRun: args.dryRun }
      } else {
        if (!args.olderThanDays) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: olderThanDays is required for lastAccessedOlderThan strategy',
              },
            ],
            isError: true,
          }
        }
        cleanupArgs = {
          strategy: 'lastAccessedOlderThan',
          olderThanDays: args.olderThanDays,
          dryRun: args.dryRun,
        }
      }

      const result = await container.cleanupMemory.execute(cleanupArgs)
      const durationMs = Math.round(performance.now() - start)
      logger?.info(
        {
          tool: 'memory_cleanup',
          durationMs,
          deletedCount: result.deletedCount,
          dryRun: result.dryRun,
          strategy,
        },
        'memory_cleanup completed',
      )
      const action = result.dryRun ? 'Would delete' : 'Deleted'
      const reason =
        strategy === 'leastAccessed'
          ? `(least accessed, limit: ${args.limit})`
          : `(not accessed in ${args.olderThanDays} days)`
      return {
        content: [
          {
            type: 'text',
            text: `${action} ${result.deletedCount} memories ${reason}.`,
          },
        ],
      }
    }, logger)
  })
}
