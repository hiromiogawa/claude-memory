import type { ConversationLog } from '@claude-memory/core'
import { describe, expect, it } from 'vitest'
import { QAChunkingStrategy } from '../src/qa-chunking-strategy.js'

describe('QAChunkingStrategy', () => {
  const strategy = new QAChunkingStrategy()

  it('should create Q&A pairs from user-assistant message pairs', () => {
    const log: ConversationLog = {
      sessionId: 'session-1',
      projectPath: '/my/project',
      messages: [
        { role: 'user', content: 'TypeScriptとは？', timestamp: new Date() },
        { role: 'assistant', content: '型付きJavaScriptです', timestamp: new Date() },
        { role: 'user', content: 'メリットは？', timestamp: new Date() },
        { role: 'assistant', content: '型安全です', timestamp: new Date() },
      ],
    }
    const chunks = strategy.chunk(log)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]!.content).toContain('TypeScriptとは？')
    expect(chunks[0]!.content).toContain('型付きJavaScriptです')
    expect(chunks[0]!.metadata.sessionId).toBe('session-1')
    expect(chunks[0]!.metadata.projectPath).toBe('/my/project')
    expect(chunks[0]!.metadata.source).toBe('auto')
  })

  it('should handle odd number of messages (trailing user message)', () => {
    const log: ConversationLog = {
      sessionId: 's1',
      messages: [
        { role: 'user', content: 'question1', timestamp: new Date() },
        { role: 'assistant', content: 'answer1', timestamp: new Date() },
        { role: 'user', content: 'question2', timestamp: new Date() },
      ],
    }
    const chunks = strategy.chunk(log)
    expect(chunks).toHaveLength(1)
  })

  it('should return empty array for empty conversation', () => {
    const log: ConversationLog = { sessionId: 's1', messages: [] }
    expect(strategy.chunk(log)).toHaveLength(0)
  })

  it('should merge consecutive same-role messages', () => {
    const log: ConversationLog = {
      sessionId: 's1',
      messages: [
        { role: 'user', content: 'q1', timestamp: new Date() },
        { role: 'user', content: 'q2', timestamp: new Date() },
        { role: 'assistant', content: 'a1', timestamp: new Date() },
      ],
    }
    const chunks = strategy.chunk(log)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.content).toContain('q1')
    expect(chunks[0]!.content).toContain('q2')
    expect(chunks[0]!.content).toContain('a1')
  })

  it('should split chunks that exceed max character limit', () => {
    const longAnswer = 'これは長い回答です。'.repeat(150) // ~1500 chars
    const log: ConversationLog = {
      sessionId: 's1',
      projectPath: '/project',
      messages: [
        { role: 'user', content: '質問', timestamp: new Date() },
        { role: 'assistant', content: longAnswer, timestamp: new Date() },
      ],
    }
    const strategy = new QAChunkingStrategy({ maxChunkChars: 500 })
    const chunks = strategy.chunk(log)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(500)
      expect(chunk.metadata.sessionId).toBe('s1')
      expect(chunk.metadata.projectPath).toBe('/project')
      expect(chunk.metadata.source).toBe('auto')
    }
  })

  it('should split at sentence boundaries when possible', () => {
    const sentences = [
      'First sentence here.',
      'Second sentence here.',
      'Third sentence here.',
      'Fourth sentence here.',
      'Fifth sentence here.',
    ]
    const longAnswer = sentences.join(' ')
    const log: ConversationLog = {
      sessionId: 's1',
      messages: [
        { role: 'user', content: 'question', timestamp: new Date() },
        { role: 'assistant', content: longAnswer, timestamp: new Date() },
      ],
    }
    // Set limit so that ~2-3 sentences fit per chunk
    const strategy = new QAChunkingStrategy({ maxChunkChars: 80 })
    const chunks = strategy.chunk(log)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(80)
    }
  })

  it('should use default maxChunkChars of 1000 when not specified', () => {
    const longAnswer = 'A'.repeat(2500)
    const log: ConversationLog = {
      sessionId: 's1',
      messages: [
        { role: 'user', content: 'q', timestamp: new Date() },
        { role: 'assistant', content: longAnswer, timestamp: new Date() },
      ],
    }
    const strategy = new QAChunkingStrategy()
    const chunks = strategy.chunk(log)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(1000)
    }
  })
})
