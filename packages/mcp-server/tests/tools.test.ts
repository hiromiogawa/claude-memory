import {
  EmbeddingFailedError,
  MemoryNotFoundError,
  StorageConnectionError,
} from '@claude-memory/core'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Logger } from 'pino'
import { describe, expect, it, vi } from 'vitest'
import type { Container } from '../src/container.js'
import { handleToolError } from '../src/tools/error-handler.js'
import { registerMemoryCleanupTool } from '../src/tools/memory-cleanup.js'
import { registerMemoryClearTool } from '../src/tools/memory-clear.js'
import { registerMemoryDeleteTool } from '../src/tools/memory-delete.js'
import { registerMemoryExportTool } from '../src/tools/memory-export.js'
import { registerMemoryImportTool } from '../src/tools/memory-import.js'
import { registerMemoryListTool } from '../src/tools/memory-list.js'
import { registerMemorySaveTool } from '../src/tools/memory-save.js'
import { registerMemorySearchTool } from '../src/tools/memory-search.js'
import { registerMemoryStatsTool } from '../src/tools/memory-stats.js'
import { registerMemoryUpdateTool } from '../src/tools/memory-update.js'

/** Mock Pino logger */
function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger
}

/** Mock McpServer that captures tool registrations */
function createMockServer() {
  const tools = new Map<string, { description: string; handler: Function }>()
  return {
    tool: vi.fn((...args: unknown[]) => {
      // server.tool has two overloads:
      //   tool(name, description, schema, handler)
      //   tool(name, description, handler)  -- no schema
      if (args.length === 4) {
        const [name, description, , handler] = args as [string, string, unknown, Function]
        tools.set(name, { description, handler })
      } else if (args.length === 3) {
        const [name, description, handler] = args as [string, string, Function]
        tools.set(name, { description, handler })
      }
    }),
    tools,
  }
}

/** Mock Container with all use cases */
function createMockContainer(overrides: Record<string, unknown> = {}) {
  return {
    saveMemory: { saveManual: vi.fn().mockResolvedValue({ saved: true }) },
    searchMemory: { search: vi.fn().mockResolvedValue([]) },
    deleteMemory: { execute: vi.fn() },
    listMemories: { execute: vi.fn().mockResolvedValue([]) },
    getStats: {
      execute: vi.fn().mockResolvedValue({
        totalMemories: 0,
        totalSessions: 0,
        averageContentLength: 0,
        oldestMemory: null,
        newestMemory: null,
        manualCount: 0,
        autoCount: 0,
      }),
    },
    clearMemory: { execute: vi.fn() },
    updateMemory: { execute: vi.fn() },
    exportMemory: { execute: vi.fn().mockResolvedValue([]) },
    importMemory: { execute: vi.fn().mockResolvedValue({ imported: 0 }) },
    cleanupMemory: { execute: vi.fn().mockResolvedValue({ deletedCount: 0, dryRun: true }) },
    storage: {},
    embedding: {},
    chunking: {},
    ...overrides,
  } as unknown as Container
}

describe('handleToolError', () => {
  it('returns result on success', async () => {
    const result = await handleToolError(async () => ({
      content: [{ type: 'text' as const, text: 'ok' }],
    }))
    expect(result.content[0].text).toBe('ok')
  })

  it('catches errors and returns error message', async () => {
    const logger = createMockLogger()
    const result = await handleToolError(async () => {
      throw new Error('boom')
    }, logger)
    expect(result.content[0].text).toBe('Internal error: boom')
    expect(result.isError).toBe(true)
    expect(logger.error).toHaveBeenCalledWith({ error: 'boom' }, 'tool error')
  })

  it('handles non-Error throws', async () => {
    const result = await handleToolError(async () => {
      throw 'string error'
    })
    expect(result.content[0].text).toBe('Internal error: Unknown error')
    expect(result.isError).toBe(true)
  })
})

describe('memory_save tool', () => {
  it('registers with correct name and description', () => {
    const server = createMockServer()
    const container = createMockContainer()
    const logger = createMockLogger()
    registerMemorySaveTool(server as unknown as McpServer, container, logger)

    expect(server.tool).toHaveBeenCalledOnce()
    expect(server.tools.has('memory_save')).toBe(true)
    expect(server.tools.get('memory_save')?.description).toBe('Save a manual memory entry')
  })

  it('calls saveManual and returns success message when saved=true', async () => {
    const server = createMockServer()
    const container = createMockContainer()
    const logger = createMockLogger()
    registerMemorySaveTool(server as unknown as McpServer, container, logger)

    const handler = server.tools.get('memory_save')!.handler
    const result = await handler({ content: 'test', sessionId: 'sess-1' })

    expect(container.saveMemory.saveManual).toHaveBeenCalledWith({
      content: 'test',
      sessionId: 'sess-1',
    })
    expect(result.content[0].text).toMatch(/^Memory saved successfully\./)
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'memory_save', saved: true }),
      'memory_save completed',
    )
  })

  it('returns "Duplicate memory skipped." when saved=false', async () => {
    const container = createMockContainer({
      saveMemory: { saveManual: vi.fn().mockResolvedValue({ saved: false }) },
    })
    const server = createMockServer()
    const logger = createMockLogger()
    registerMemorySaveTool(server as unknown as McpServer, container, logger)

    const handler = server.tools.get('memory_save')!.handler
    const result = await handler({ content: 'dup', sessionId: 'sess-1' })

    expect(result.content[0].text).toMatch(/^Duplicate memory skipped\./)
  })
})

describe('memory_search tool', () => {
  it('registers with correct name', () => {
    const server = createMockServer()
    const container = createMockContainer()
    const logger = createMockLogger()
    registerMemorySearchTool(server as unknown as McpServer, container, logger)

    expect(server.tools.has('memory_search')).toBe(true)
  })

  it('returns "No memories found." for empty results', async () => {
    const server = createMockServer()
    const container = createMockContainer()
    const logger = createMockLogger()
    registerMemorySearchTool(server as unknown as McpServer, container, logger)

    const handler = server.tools.get('memory_search')!.handler
    const result = await handler({ query: 'test', limit: 5, allProjects: false })

    expect(result.content[0].text).toMatch(/^No memories found\./)
  })

  it('returns formatted results when memories exist', async () => {
    const container = createMockContainer({
      searchMemory: {
        search: vi.fn().mockResolvedValue([
          {
            matchType: 'hybrid',
            score: 0.95,
            memory: { content: 'Found memory content' },
          },
        ]),
      },
    })
    const server = createMockServer()
    const logger = createMockLogger()
    registerMemorySearchTool(server as unknown as McpServer, container, logger)

    const handler = server.tools.get('memory_search')!.handler
    const result = await handler({ query: 'test', limit: 5, allProjects: false })

    expect(result.content[0].text).toContain('[1] matchType=hybrid score=0.9500')
    expect(result.content[0].text).toContain('Found memory content')
  })
})

describe('memory_delete tool', () => {
  it('calls deleteMemory.execute with the given id', async () => {
    const server = createMockServer()
    const container = createMockContainer()
    const logger = createMockLogger()
    registerMemoryDeleteTool(server as unknown as McpServer, container, logger)

    const handler = server.tools.get('memory_delete')!.handler
    const testId = '550e8400-e29b-41d4-a716-446655440000'
    const result = await handler({ id: testId })

    expect(container.deleteMemory.execute).toHaveBeenCalledWith(testId)
    expect(result.content[0].text).toBe(`Memory ${testId} deleted.`)
  })
})

describe('memory_stats tool', () => {
  it('returns formatted statistics', async () => {
    const server = createMockServer()
    const logger = createMockLogger()
    const container = createMockContainer({
      getStats: {
        execute: vi.fn().mockResolvedValue({
          totalMemories: 42,
          totalSessions: 10,
          averageContentLength: 150.5,
          oldestMemory: null,
          newestMemory: null,
          manualCount: 30,
          autoCount: 12,
        }),
      },
    })
    registerMemoryStatsTool(server as unknown as McpServer, container, logger)

    const handler = server.tools.get('memory_stats')!.handler
    const result = await handler()

    const text = result.content[0].text
    expect(text).toContain('Total memories: 42')
    expect(text).toContain('Manual: 30')
    expect(text).toContain('Auto: 12')
    expect(text).toContain('Total sessions: 10')
    expect(text).toContain('Oldest memory: N/A')
    expect(text).toContain('Average content length: 150.5 chars')
  })
})

describe('memory_export tool', () => {
  it('returns JSON stringified data', async () => {
    const exportData = [{ id: '1', content: 'test memory' }]
    const container = createMockContainer({
      exportMemory: { execute: vi.fn().mockResolvedValue(exportData) },
    })
    const server = createMockServer()
    const logger = createMockLogger()
    registerMemoryExportTool(server as unknown as McpServer, container, logger)

    const handler = server.tools.get('memory_export')!.handler
    const result = await handler()

    expect(result.content[0].text).toBe(JSON.stringify(exportData, null, 2))
  })
})

describe('memory_cleanup tool', () => {
  it('returns dry-run message when dryRun=true', async () => {
    const container = createMockContainer({
      cleanupMemory: { execute: vi.fn().mockResolvedValue({ deletedCount: 5, dryRun: true }) },
    })
    const server = createMockServer()
    const logger = createMockLogger()
    registerMemoryCleanupTool(server as unknown as McpServer, container, logger)

    const handler = server.tools.get('memory_cleanup')!.handler
    const result = await handler({ olderThanDays: 30, dryRun: true })

    expect(container.cleanupMemory.execute).toHaveBeenCalledWith({
      olderThanDays: 30,
      dryRun: true,
    })
    expect(result.content[0].text).toBe('Would delete 5 memories (not accessed in 30 days).')
  })

  it('returns deletion message when dryRun=false', async () => {
    const container = createMockContainer({
      cleanupMemory: { execute: vi.fn().mockResolvedValue({ deletedCount: 3, dryRun: false }) },
    })
    const server = createMockServer()
    const logger = createMockLogger()
    registerMemoryCleanupTool(server as unknown as McpServer, container, logger)

    const handler = server.tools.get('memory_cleanup')!.handler
    const result = await handler({ olderThanDays: 60, dryRun: false })

    expect(result.content[0].text).toBe('Deleted 3 memories (not accessed in 60 days).')
  })
})

describe('unified error handling', () => {
  it('returns error response for MemoryNotFoundError on delete', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440000'
    const container = createMockContainer({
      deleteMemory: {
        execute: vi.fn().mockRejectedValue(new MemoryNotFoundError(testId)),
      },
    })
    const server = createMockServer()
    registerMemoryDeleteTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_delete')!.handler
    const result = await handler({ id: testId })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe(`Error: Memory not found: ${testId}`)
  })

  it('returns error response for MemoryNotFoundError on update', async () => {
    const testId = '550e8400-e29b-41d4-a716-446655440000'
    const container = createMockContainer({
      updateMemory: {
        execute: vi.fn().mockRejectedValue(new MemoryNotFoundError(testId)),
      },
    })
    const server = createMockServer()
    registerMemoryUpdateTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_update')!.handler
    const result = await handler({ id: testId, content: 'updated' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe(`Error: Memory not found: ${testId}`)
  })

  it('returns error response for EmbeddingFailedError on save', async () => {
    const container = createMockContainer({
      saveMemory: {
        saveManual: vi.fn().mockRejectedValue(new EmbeddingFailedError('model unavailable')),
      },
    })
    const server = createMockServer()
    registerMemorySaveTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_save')!.handler
    const result = await handler({ content: 'test', sessionId: 'sess-1' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: Embedding failed: model unavailable')
  })

  it('returns error response for EmbeddingFailedError on search', async () => {
    const container = createMockContainer({
      searchMemory: {
        search: vi.fn().mockRejectedValue(new EmbeddingFailedError('timeout')),
      },
    })
    const server = createMockServer()
    registerMemorySearchTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_search')!.handler
    const result = await handler({ query: 'test', limit: 5, allProjects: false })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: Embedding failed: timeout')
  })

  it('returns error response for StorageConnectionError on cleanup', async () => {
    const container = createMockContainer({
      cleanupMemory: {
        execute: vi.fn().mockRejectedValue(new StorageConnectionError('connection refused')),
      },
    })
    const server = createMockServer()
    registerMemoryCleanupTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_cleanup')!.handler
    const result = await handler({ olderThanDays: 30, dryRun: true })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: Storage connection error: connection refused')
  })

  it('returns internal error for unknown errors', async () => {
    const container = createMockContainer({
      deleteMemory: {
        execute: vi.fn().mockRejectedValue(new TypeError('Cannot read properties of null')),
      },
    })
    const server = createMockServer()
    registerMemoryDeleteTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_delete')!.handler
    const result = await handler({ id: '550e8400-e29b-41d4-a716-446655440000' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Internal error: Cannot read properties of null')
  })

  it('returns error response for parse errors on import', async () => {
    const container = createMockContainer()
    const server = createMockServer()
    registerMemoryImportTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_import')!.handler
    const result = await handler({ data: 'not-valid-json' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/^Internal error:/)
  })

  it('returns error response for StorageConnectionError on list', async () => {
    const container = createMockContainer({
      listMemories: {
        execute: vi.fn().mockRejectedValue(new StorageConnectionError('pool exhausted')),
      },
    })
    const server = createMockServer()
    registerMemoryListTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_list')!.handler
    const result = await handler({ limit: 10, offset: 0 })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: Storage connection error: pool exhausted')
  })

  it('returns error response on stats failure', async () => {
    const container = createMockContainer({
      getStats: {
        execute: vi.fn().mockRejectedValue(new StorageConnectionError('db down')),
      },
    })
    const server = createMockServer()
    registerMemoryStatsTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_stats')!.handler
    const result = await handler()

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: Storage connection error: db down')
  })

  it('returns error response on export failure', async () => {
    const container = createMockContainer({
      exportMemory: {
        execute: vi.fn().mockRejectedValue(new StorageConnectionError('timeout')),
      },
    })
    const server = createMockServer()
    registerMemoryExportTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_export')!.handler
    const result = await handler()

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: Storage connection error: timeout')
  })

  it('returns error response on clear failure', async () => {
    const container = createMockContainer({
      clearMemory: {
        execute: vi.fn().mockRejectedValue(new StorageConnectionError('permission denied')),
      },
    })
    const server = createMockServer()
    registerMemoryClearTool(server as unknown as McpServer, container)

    const handler = server.tools.get('memory_clear')!.handler
    const result = await handler()

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: Storage connection error: permission denied')
  })
})
