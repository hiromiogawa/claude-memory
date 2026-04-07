import type { SearchFilter, SearchResult } from '@claude-memory/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionStartHandler } from '../src/session-start-handler.js'

function createMemory(id: string, content: string): SearchResult {
  return {
    memory: {
      id,
      content,
      embedding: null,
      metadata: { sessionId: 'sess-1', source: 'auto' },
      createdAt: new Date('2026-04-01T00:00:00Z'),
      updatedAt: new Date('2026-04-01T00:00:00Z'),
      lastAccessedAt: new Date('2026-04-01T00:00:00Z'),
    },
    score: 0.85,
    matchType: 'hybrid',
  }
}

describe('SessionStartHandler', () => {
  let mockSearchUseCase: {
    search: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockSearchUseCase = {
      search: vi.fn(),
    }
  })

  it('should return formatted memories when results exist', async () => {
    mockSearchUseCase.search.mockResolvedValue([
      createMemory('1', 'Project uses TypeScript'),
      createMemory('2', 'Database is PostgreSQL'),
    ])

    const handler = new SessionStartHandler(mockSearchUseCase)
    const result = await handler.handle('/my/project')

    expect(result).toContain('## Previous session context:')
    expect(result).toContain('[1]')
    expect(result).toContain('Project uses TypeScript')
    expect(result).toContain('[2]')
    expect(result).toContain('Database is PostgreSQL')
  })

  it('should return no-results message when no memories found', async () => {
    mockSearchUseCase.search.mockResolvedValue([])

    const handler = new SessionStartHandler(mockSearchUseCase)
    const result = await handler.handle('/my/project')

    expect(result).toBe('No relevant memories found.')
  })

  it('should pass projectPath as filter when provided', async () => {
    mockSearchUseCase.search.mockResolvedValue([])

    const handler = new SessionStartHandler(mockSearchUseCase)
    await handler.handle('/my/project')

    expect(mockSearchUseCase.search).toHaveBeenCalledWith('project context', 5, {
      projectPath: '/my/project',
    })
  })

  it('should search without filter when projectPath is undefined', async () => {
    mockSearchUseCase.search.mockResolvedValue([])

    const handler = new SessionStartHandler(mockSearchUseCase)
    await handler.handle()

    expect(mockSearchUseCase.search).toHaveBeenCalledWith('project context', 5, undefined)
  })

  it('should include score in formatted output', async () => {
    mockSearchUseCase.search.mockResolvedValue([createMemory('1', 'Some memory')])

    const handler = new SessionStartHandler(mockSearchUseCase)
    const result = await handler.handle()

    expect(result).toContain('(score: 0.85)')
  })
})
