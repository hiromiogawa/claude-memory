import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'
import { memoryDeleteSchema, TOOL_METADATA } from './tool-metadata.js'

const meta = TOOL_METADATA.find((t) => t.name === 'memory_delete')!

/**
 * memory_deleteツールをMCP serverに登録する。
 * @param server - MCP serverインスタンス
 * @param container - DIコンテナ
 * @param logger - Pinoロガーインスタンス
 */
export function registerMemoryDeleteTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(meta.name, meta.description, memoryDeleteSchema, async (args) => {
    return handleToolError(async () => {
      const start = performance.now()
      await container.deleteMemory.execute(args.id)
      const durationMs = Math.round(performance.now() - start)
      logger.info({ tool: 'memory_delete', durationMs, id: args.id }, 'memory_delete completed')
      return {
        content: [{ type: 'text', text: `Memory ${args.id} deleted.` }],
      }
    }, logger)
  })
}
