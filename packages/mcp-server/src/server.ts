// packages/mcp-server/src/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { pino } from 'pino'
import { loadConfig } from './config.js'
import { createContainer } from './container.js'
import { registerMemoryClearTool } from './tools/memory-clear.js'
import { registerMemoryDeleteTool } from './tools/memory-delete.js'
import { registerMemoryListTool } from './tools/memory-list.js'
import { registerMemorySaveTool } from './tools/memory-save.js'
import { registerMemorySearchTool } from './tools/memory-search.js'
import { registerMemoryStatsTool } from './tools/memory-stats.js'
import { registerMemoryUpdateTool } from './tools/memory-update.js'

export async function startServer() {
  const config = loadConfig()
  const logger = pino({ level: config.logLevel })

  logger.info('Starting claude-memory MCP server...')

  const container = createContainer(config)
  const server = new McpServer({
    name: 'claude-memory',
    version: '0.0.1',
  })

  registerMemorySaveTool(server, container)
  registerMemorySearchTool(server, container)
  registerMemoryDeleteTool(server, container)
  registerMemoryListTool(server, container)
  registerMemoryStatsTool(server, container)
  registerMemoryClearTool(server, container)
  registerMemoryUpdateTool(server, container)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  logger.info('claude-memory MCP server running on stdio')
}
