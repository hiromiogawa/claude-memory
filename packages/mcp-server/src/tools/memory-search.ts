import type { SearchFilter } from '@claude-memory/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Container } from '../container.js'

export function registerMemorySearchTool(server: McpServer, container: Container): void {
  server.tool(
    'memory_search',
    'Search memories with hybrid search (keyword + vector)',
    {
      query: z.string().min(1),
      limit: z.number().optional().default(20),
      projectPath: z.string().optional(),
      tags: z.array(z.string()).optional(),
      allProjects: z
        .boolean()
        .optional()
        .default(false)
        .describe('Search across all projects instead of scoping to projectPath'),
    },
    async (args) => {
      const filter: SearchFilter = {}
      if (!args.allProjects && args.projectPath) {
        filter.projectPath = args.projectPath
      }
      if (args.tags) {
        filter.tags = args.tags
      }
      const hasFilter = Object.keys(filter).length > 0
      const results = await container.searchMemory.search(
        args.query,
        args.limit,
        hasFilter ? filter : undefined,
      )

      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: 'No memories found.' }],
        }
      }

      const formatted = results
        .map((r, i) => {
          const lines = [
            `[${i + 1}] matchType=${r.matchType} score=${r.score.toFixed(4)}`,
            r.memory.content,
          ]
          return lines.join('\n')
        })
        .join('\n\n')

      return {
        content: [{ type: 'text', text: formatted }],
      }
    },
  )
}
