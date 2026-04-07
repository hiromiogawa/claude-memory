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
  logger: Logger,
): void {
  server.tool(meta.name, meta.description, memoryCleanupSchema, async (args) => {
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
  })
}
