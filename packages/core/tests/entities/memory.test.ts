import { describe, expect, it } from 'vitest'
import { SEARCH_DEFAULTS } from '../../src/constants.js'
import type { Memory, MemoryMetadata } from '../../src/entities/memory.js'

describe('Memory entity', () => {
  it('should define Memory interface fields', () => {
    const metadata: MemoryMetadata = {
      sessionId: 'session-1',
      source: 'manual',
    }
    const memory: Memory = {
      id: 'uuid-1',
      content: 'test content',
      embedding: [0.1, 0.2, 0.3],
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(memory.id).toBe('uuid-1')
    expect(memory.content).toBe('test content')
    expect(memory.metadata.source).toBe('manual')
  })

  it('should have optional fields in metadata', () => {
    const metadata: MemoryMetadata = {
      sessionId: 'session-1',
      projectPath: '/path/to/project',
      tags: ['typescript', 'testing'],
      source: 'auto',
    }
    expect(metadata.projectPath).toBe('/path/to/project')
    expect(metadata.tags).toEqual(['typescript', 'testing'])
  })
})

describe('SEARCH_DEFAULTS', () => {
  it('should have correct default values', () => {
    expect(SEARCH_DEFAULTS.rrfK).toBe(60)
    expect(SEARCH_DEFAULTS.decayHalfLifeDays).toBe(30)
    expect(SEARCH_DEFAULTS.maxResults).toBe(20)
  })
})
