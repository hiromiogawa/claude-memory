import { SEARCH_DEFAULTS } from '@claude-memory/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import { z } from 'zod'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'

export function registerMemoryListTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(
    'memory_list',
    'List memories with pagination',
    {
      limit: z.number().optional().default(SEARCH_DEFAULTS.maxResults),
      offset: z.number().optional().default(0),
      source: z.enum(['manual', 'auto']).optional(),
      tags: z.array(z.string()).optional(),
    },
    async (args) => {
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
    },
  )
}
