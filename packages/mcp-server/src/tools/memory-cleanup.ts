import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'
import { memoryCleanupSchema, TOOL_METADATA } from './tool-metadata.js'

const meta = TOOL_METADATA.find((t) => t.name === 'memory_cleanup')!

type CleanupArgs = Parameters<Container['cleanupMemory']['execute']>[0]

interface RawCleanupArgs {
  strategy?: 'lastAccessedOlderThan' | 'leastAccessed'
  olderThanDays?: number
  limit?: number
  dryRun?: boolean
}

type ValidateResult = { ok: true; value: CleanupArgs } | { ok: false; error: string }

/** strategy 別の引数バリデーション。成功時は CleanupArgs、失敗時はエラーメッセージを返す。 */
function validateCleanupArgs(args: RawCleanupArgs): ValidateResult {
  const strategy = args.strategy ?? 'lastAccessedOlderThan'
  if (strategy === 'leastAccessed') {
    if (!args.limit) {
      return { ok: false, error: 'Error: limit is required for leastAccessed strategy' }
    }
    return {
      ok: true,
      value: { strategy: 'leastAccessed', limit: args.limit, dryRun: args.dryRun },
    }
  }
  if (!args.olderThanDays) {
    return {
      ok: false,
      error: 'Error: olderThanDays is required for lastAccessedOlderThan strategy',
    }
  }
  return {
    ok: true,
    value: {
      strategy: 'lastAccessedOlderThan',
      olderThanDays: args.olderThanDays,
      dryRun: args.dryRun,
    },
  }
}

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
      const validated = validateCleanupArgs(args)
      if (!validated.ok) {
        return {
          content: [{ type: 'text', text: validated.error }],
          isError: true,
        }
      }

      const result = await container.cleanupMemory.execute(validated.value)
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
