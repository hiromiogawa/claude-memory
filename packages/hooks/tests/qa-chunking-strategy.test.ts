import type { ConversationLog } from '@claude-memory/core'
import { describe, expect, it, type MockInstance, vi } from 'vitest'
import { QAChunkingStrategy } from '../src/qa-chunking-strategy.js'

describe('QAChunkingStrategy', () => {
  const strategy = new QAChunkingStrategy()

  it('should create Q&A pairs from user-assistant message pairs', () => {
    const log: ConversationLog = {
      sessionId: 'session-1',
      projectPath: '/my/project',
      messages: [
        { role: 'user', content: 'TypeScriptの設計方針とは？', timestamp: new Date() },
        {
          role: 'assistant',
          content: '型付きJavaScriptです。静的型システムを採用した理由は型安全性の向上です。',
          timestamp: new Date(),
        },
        { role: 'user', content: 'テストのメリットは？', timestamp: new Date() },
        {
          role: 'assistant',
          content: 'テストを実装することで型安全性を検証でき、リファクタも安心して行えます。',
          timestamp: new Date(),
        },
      ],
    }
    const chunks = strategy.chunk(log)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]!.content).toContain('TypeScriptの設計方針とは？')
    expect(chunks[0]!.content).toContain('型付きJavaScriptです')
    expect(chunks[0]!.metadata.sessionId).toBe('session-1')
    expect(chunks[0]!.metadata.projectPath).toBe('/my/project')
    expect(chunks[0]!.metadata.source).toBe('auto')
  })

  it('should handle odd number of messages (trailing user message)', () => {
    const log: ConversationLog = {
      sessionId: 's1',
      messages: [
        { role: 'user', content: 'この設計方針について質問があります', timestamp: new Date() },
        {
          role: 'assistant',
          content: 'はい、設計の決定についてお答えします。理由は以下の通りです。',
          timestamp: new Date(),
        },
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
        { role: 'user', content: 'この実装方針について', timestamp: new Date() },
        { role: 'user', content: 'テストの設計も含めて教えてください', timestamp: new Date() },
        {
          role: 'assistant',
          content: 'テストを実装する理由は、リファクタ時の安全性を確保するためです。',
          timestamp: new Date(),
        },
      ],
    }
    const chunks = strategy.chunk(log)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.content).toContain('この実装方針について')
    expect(chunks[0]!.content).toContain('テストの設計も含めて教えてください')
    expect(chunks[0]!.content).toContain('テストを実装する理由')
  })

  it('should split chunks that exceed max character limit', () => {
    const longAnswer = 'この設計の理由は以下です。'.repeat(150) // ~1800 chars
    const log: ConversationLog = {
      sessionId: 's1',
      projectPath: '/project',
      messages: [
        { role: 'user', content: '設計方針について質問', timestamp: new Date() },
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
      'The design decision was made.',
      'The implementation reason follows.',
      'We chose this architecture.',
      'The test strategy is clear.',
      'The refactor cause was identified.',
    ]
    const longAnswer = sentences.join(' ')
    const log: ConversationLog = {
      sessionId: 's1',
      messages: [
        { role: 'user', content: 'What was the design decision?', timestamp: new Date() },
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
    const longAnswer = 'This implementation decision is the reason. '.repeat(80) // ~3520 chars
    const log: ConversationLog = {
      sessionId: 's1',
      messages: [
        { role: 'user', content: 'What is the design reason?', timestamp: new Date() },
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

  describe('importance filtering', () => {
    it('should filter out trivial conversations', () => {
      const log: ConversationLog = {
        sessionId: 's1',
        messages: [
          { role: 'user', content: 'こんにちは', timestamp: new Date() },
          {
            role: 'assistant',
            content: 'こんにちは！何かお手伝いできますか？',
            timestamp: new Date(),
          },
        ],
      }
      const strategy = new QAChunkingStrategy()
      const chunks = strategy.chunk(log)
      expect(chunks).toHaveLength(0)
    })

    it('should keep important conversations about design decisions', () => {
      const log: ConversationLog = {
        sessionId: 's1',
        messages: [
          { role: 'user', content: 'データベースの設計方針を決定したい', timestamp: new Date() },
          {
            role: 'assistant',
            content:
              'PostgreSQLを採用する理由は、pgvectorによるベクトル検索とpg_bigmによる日本語検索が統合できるためです。',
            timestamp: new Date(),
          },
        ],
      }
      const strategy = new QAChunkingStrategy()
      const chunks = strategy.chunk(log)
      expect(chunks).toHaveLength(1)
    })

    it('should filter out short confirmations', () => {
      const log: ConversationLog = {
        sessionId: 's1',
        messages: [
          { role: 'user', content: 'OK', timestamp: new Date() },
          { role: 'assistant', content: 'はい', timestamp: new Date() },
        ],
      }
      const strategy = new QAChunkingStrategy()
      const chunks = strategy.chunk(log)
      expect(chunks).toHaveLength(0)
    })

    it('should warn when all chunks are filtered out by importance filter', () => {
      const warnSpy: MockInstance = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const log: ConversationLog = {
          sessionId: 's1',
          messages: [
            { role: 'user', content: 'こんにちは、元気ですか？', timestamp: new Date() },
            {
              role: 'assistant',
              content: 'こんにちは！元気です。何かお手伝いできますか？',
              timestamp: new Date(),
            },
            {
              role: 'user',
              content: '今日はいい天気ですね。散歩に行きました。',
              timestamp: new Date(),
            },
            {
              role: 'assistant',
              content: 'そうですね、素晴らしい一日ですね。楽しい散歩だったでしょう。',
              timestamp: new Date(),
            },
          ],
        }
        const strategy = new QAChunkingStrategy()
        const chunks = strategy.chunk(log)
        expect(chunks).toHaveLength(0)
        expect(warnSpy).toHaveBeenCalledOnce()
        expect(warnSpy).toHaveBeenCalledWith('All 2 chunks were filtered out by importance filter')
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('should not warn when some chunks pass importance filter', () => {
      const warnSpy: MockInstance = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const log: ConversationLog = {
          sessionId: 's1',
          messages: [
            { role: 'user', content: 'データベースの設計方針を決定したい', timestamp: new Date() },
            {
              role: 'assistant',
              content:
                'PostgreSQLを採用する理由は、pgvectorによるベクトル検索とpg_bigmによる日本語検索が統合できるためです。',
              timestamp: new Date(),
            },
          ],
        }
        const strategy = new QAChunkingStrategy()
        const chunks = strategy.chunk(log)
        expect(chunks).toHaveLength(1)
        expect(warnSpy).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('should not warn when filterByImportance is disabled', () => {
      const warnSpy: MockInstance = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const log: ConversationLog = {
          sessionId: 's1',
          messages: [
            { role: 'user', content: 'こんにちは、元気ですか？', timestamp: new Date() },
            {
              role: 'assistant',
              content: 'こんにちは！元気です。何かお手伝いできますか？',
              timestamp: new Date(),
            },
          ],
        }
        const strategy = new QAChunkingStrategy({ filterByImportance: false })
        const chunks = strategy.chunk(log)
        expect(chunks).toHaveLength(1)
        expect(warnSpy).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('should not warn when there are no chunks before filtering', () => {
      const warnSpy: MockInstance = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const log: ConversationLog = { sessionId: 's1', messages: [] }
        const strategy = new QAChunkingStrategy()
        const chunks = strategy.chunk(log)
        expect(chunks).toHaveLength(0)
        expect(warnSpy).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('should allow disabling importance filter', () => {
      const log: ConversationLog = {
        sessionId: 's1',
        messages: [
          { role: 'user', content: 'こんにちは', timestamp: new Date() },
          {
            role: 'assistant',
            content: 'こんにちは！何かお手伝いできますか？',
            timestamp: new Date(),
          },
        ],
      }
      const strategy = new QAChunkingStrategy({ filterByImportance: false })
      const chunks = strategy.chunk(log)
      expect(chunks).toHaveLength(1)
    })
  })
})
