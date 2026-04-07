import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'
import { memoryListSchema, TOOL_METADATA } from './tool-metadata.js'

const meta = TOOL_METADATA.find((t) => t.name === 'memory_list')!

/**
 * memory_listツールをMCP serverに登録する。
 * @param server - MCP serverインスタンス
 * @param container - DIコンテナ
 * @param logger - Pinoロガーインスタンス
 */
export function registerMemoryListTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(meta.name, meta.description, memoryListSchema, async (args) => {
    return handleToolError(async () => {
      const start = performance.now()
      const memories = await container.listMemories.execute({
        limit: args.limit,
        offset: args.offset,
        source: args.source,
        tags: args.tags,
      })
      const durationMs = Math.round(performance.now() - start)
      logger.info(
        { tool: 'memory_list', durationMs, count: memories.length },
        'memory_list completed',
      )

      if (memories.length === 0) {
        return {
          content: [{ type: 'text', text: 'No memories found.' }],
        }
      }

      const formatted = memories
        .map((m, i) => {
          const lines = [
            `[${i + 1}] id=${m.id} source=${m.metadata.source} createdAt=${m.createdAt.toISOString()}`,
            m.content,
          ]
          return lines.join('\n')
        })
        .join('\n\n')

      return {
        content: [{ type: 'text', text: formatted }],
      }
    }, logger)
  })
}
