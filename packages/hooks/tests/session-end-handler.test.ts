import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QAChunkingStrategy } from '../src/qa-chunking-strategy.js'
import { SessionEndHandler } from '../src/session-end-handler.js'

describe('SessionEndHandler', () => {
  const testDir = join(tmpdir(), 'claude-memory-test-' + Date.now())
  let mockSaveUseCase: any

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
    mockSaveUseCase = {
      saveManual: vi.fn(),
      saveConversation: vi.fn(),
    }
  })

  it('should parse JSONL log and call saveConversation', async () => {
    const logPath = join(testDir, 'conversation.jsonl')
    const lines = [
      JSON.stringify({ role: 'user', content: 'hello', timestamp: '2026-04-03T10:00:00Z' }),
      JSON.stringify({ role: 'assistant', content: 'hi there', timestamp: '2026-04-03T10:00:01Z' }),
    ]
    writeFileSync(logPath, lines.join('\n'))

    const handler = new SessionEndHandler(new QAChunkingStrategy(), mockSaveUseCase)
    await handler.handle(logPath, 'session-123', '/my/project')

    expect(mockSaveUseCase.saveConversation).toHaveBeenCalledTimes(1)
    const callArg = vi.mocked(mockSaveUseCase.saveConversation).mock.calls[0]![0]
    expect(callArg.sessionId).toBe('session-123')
    expect(callArg.messages).toHaveLength(2)
    expect(callArg.messages[0]!.role).toBe('user')
  })

  it('should handle empty log file gracefully', async () => {
    const logPath = join(testDir, 'empty.jsonl')
    writeFileSync(logPath, '')

    const handler = new SessionEndHandler(new QAChunkingStrategy(), mockSaveUseCase)
    await handler.handle(logPath, 'session-123')

    expect(mockSaveUseCase.saveConversation).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [] }),
    )
  })

  it('should skip malformed JSON lines', async () => {
    const logPath = join(testDir, 'malformed.jsonl')
    const lines = [
      JSON.stringify({ role: 'user', content: 'valid', timestamp: '2026-04-03T10:00:00Z' }),
      'not json at all',
      JSON.stringify({
        role: 'assistant',
        content: 'also valid',
        timestamp: '2026-04-03T10:00:01Z',
      }),
    ]
    writeFileSync(logPath, lines.join('\n'))

    const handler = new SessionEndHandler(new QAChunkingStrategy(), mockSaveUseCase)
    await handler.handle(logPath, 'session-123')

    const callArg = vi.mocked(mockSaveUseCase.saveConversation).mock.calls[0]![0]
    expect(callArg.messages).toHaveLength(2)
  })
})
