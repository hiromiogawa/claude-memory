import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import { z } from 'zod'
import type { Container } from '../container.js'
import { handleToolError } from './error-handler.js'
import { memoryImportSchema, TOOL_METADATA } from './tool-metadata.js'

const meta = TOOL_METADATA.find((t) => t.name === 'memory_import')!

const exportedMemorySchema = z.array(
  z.object({
    content: z.string().min(1),
    metadata: z.object({
      sessionId: z.string(),
      projectPath: z.string().optional(),
      tags: z.array(z.string()).optional(),
      source: z.enum(['manual', 'auto']),
    }),
    createdAt: z.string(),
  }),
)

/**
 * Registers the memory_import tool on the MCP server.
 * @param server - The MCP server instance
 * @param container - Dependency injection container
 * @param logger - Pino logger instance
 */
export function registerMemoryImportTool(
  server: McpServer,
  container: Container,
  logger: Logger,
): void {
  server.tool(meta.name, meta.description, memoryImportSchema, async (args) => {
    return handleToolError(async () => {
      const start = performance.now()
      const parsed = exportedMemorySchema.parse(JSON.parse(args.data))
      const result = await container.importMemory.execute(parsed)
      const durationMs = Math.round(performance.now() - start)
      logger.info(
        { tool: 'memory_import', durationMs, imported: result.imported },
        'memory_import completed',
      )
      return {
        content: [{ type: 'text', text: `Imported ${result.imported} memories.` }],
      }
    }, logger)
  })
}
