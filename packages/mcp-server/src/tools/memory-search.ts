import type { SearchFilter } from '@claude-memory/core'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'
import { memorySearchSchema, TOOL_METADATA } from './tool-metadata.js'

const SCORE_DECIMAL_PLACES = 4

/**
 * マッチしたキーワードをmarkdownボールドマーカーで囲んで視認性を高める。
 * @param content - ハイライト対象のコンテンツ文字列
 * @param query - ハイライトする検索クエリ
 * @returns マッチしたキーワードを ** で囲んだコンテンツ
 */
const highlightKeyword = (content: string, query: string): string => {
  if (!query) return content
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.replace(new RegExp(escaped, 'gi'), (match) => `**${match}**`)
}

const meta = TOOL_METADATA.find((t) => t.name === 'memory_search')!

/**
 * memory_searchツールをMCP serverに登録する。
 * @param server - MCP serverインスタンス
 * @param container - DIコンテナ
 * @param logger - Pinoロガーインスタンス
 */
export function registerMemorySearchTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(meta.name, meta.description, memorySearchSchema, async (args) => {
    return handleToolError(async () => {
      const start = performance.now()
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
      const durationMs = Math.round(performance.now() - start)
      logger.info(
        { tool: 'memory_search', durationMs, count: results.length },
        'memory_search completed',
      )

      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: `No memories found. (${durationMs}ms)` }],
        }
      }

      const formatted = results
        .map((r, i) => {
          const content =
            r.matchType !== 'vector'
              ? highlightKeyword(r.memory.content, args.query)
              : r.memory.content
          const lines = [
            `[${i + 1}] matchType=${r.matchType} score=${r.score.toFixed(SCORE_DECIMAL_PLACES)}`,
            content,
          ]
          return lines.join('\n')
        })
        .join('\n\n')

      return {
        content: [{ type: 'text', text: `${formatted}\n\n(${durationMs}ms)` }],
      }
    }, logger)
  })
}
