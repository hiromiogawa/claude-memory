import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'
import { memoryUpdateSchema, TOOL_METADATA } from './tool-metadata.js'

const meta = TOOL_METADATA.find((t) => t.name === 'memory_update')!

/**
 * memory_updateツールをMCP serverに登録する。
 * @param server - MCP serverインスタンス
 * @param container - DIコンテナ
 * @param logger - Pinoロガーインスタンス
 */
export function registerMemoryUpdateTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(meta.name, meta.description, memoryUpdateSchema, async (args) => {
    return handleToolError(async () => {
      const start = performance.now()
      await container.updateMemory.execute(args)
      const durationMs = Math.round(performance.now() - start)
      logger.info({ tool: 'memory_update', durationMs, id: args.id }, 'memory_update completed')
      return {
        content: [{ type: 'text', text: `Memory ${args.id} updated.` }],
      }
    }, logger)
  })
}
