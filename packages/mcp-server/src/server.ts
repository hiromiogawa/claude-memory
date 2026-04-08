// packages/mcp-server/src/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { pino } from 'pino'
import { loadConfig } from './config.js'
import { createContainer } from './container.js'
import { registerMemoryCleanupTool } from './tools/memory-cleanup.js'
import { registerMemoryClearTool } from './tools/memory-clear.js'
import { registerMemoryDeleteTool } from './tools/memory-delete.js'
import { registerMemoryExportTool } from './tools/memory-export.js'
import { registerMemoryImportTool } from './tools/memory-import.js'
import { registerMemoryListTool } from './tools/memory-list.js'
import { registerMemorySaveTool } from './tools/memory-save.js'
import { registerMemorySearchTool } from './tools/memory-search.js'
import { registerMemoryStatsTool } from './tools/memory-stats.js'
import { registerMemoryUpdateTool } from './tools/memory-update.js'

/**
 * 全メモリツールをstdioトランスポートに登録してMCP serverを起動する。
 * @returns サーバー接続完了時に解決するPromise
 */
export async function startServer() {
  const config = loadConfig()
  const logger = pino({ level: config.logLevel })

  logger.info('Starting claude-memory MCP server...')

  const container = createContainer(config)
  await container.storage.migrate()
  logger.info('Database migration check completed')
  const server = new McpServer({
    name: 'claude-memory',
    version: '0.0.1',
  })

  registerMemoryCleanupTool(server, container, logger)
  registerMemorySaveTool(server, container, logger)
  registerMemorySearchTool(server, container, logger)
  registerMemoryDeleteTool(server, container, logger)
  registerMemoryListTool(server, container, logger)
  registerMemoryStatsTool(server, container, logger)
  registerMemoryClearTool(server, container, logger)
  registerMemoryUpdateTool(server, container, logger)
  registerMemoryExportTool(server, container, logger)
  registerMemoryImportTool(server, container, logger)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  const cleanup = async () => {
    logger.info('Shutting down claude-memory MCP server...')
    await container.storage.close()
    process.exit(0)
  }
  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)

  logger.info('claude-memory MCP server running on stdio')
}
