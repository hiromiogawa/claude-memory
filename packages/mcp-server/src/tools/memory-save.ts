import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'
import { memorySaveSchema, TOOL_METADATA } from './tool-metadata.js'

const meta = TOOL_METADATA.find((t) => t.name === 'memory_save')!

/**
 * Registers the memory_save tool on the MCP server.
 * @param server - The MCP server instance
 * @param container - Dependency injection container
 * @param logger - Pino logger instance
 */
export function registerMemorySaveTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(meta.name, meta.description, memorySaveSchema, async (args) => {
    return handleToolError(async () => {
      const start = performance.now()
      const result = await container.saveMemory.saveManual(args)
      const durationMs = Math.round(performance.now() - start)
      logger.info({ tool: 'memory_save', durationMs, saved: result.saved }, 'memory_save completed')
      const text = result.saved
        ? `Memory saved successfully. (${durationMs}ms)`
        : `Duplicate memory skipped. (${durationMs}ms)`
      return {
        content: [{ type: 'text', text }],
      }
    }, logger)
  })
}
