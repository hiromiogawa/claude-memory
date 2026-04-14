import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineSessionEndHandler } from '../src/session-end-handler.js'

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

  it('should parse Claude Code JSONL log and call saveConversation', async () => {
    const logPath = join(testDir, 'conversation.jsonl')
    const lines = [
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: 'hello' },
        timestamp: '2026-04-03T10:00:00Z',
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'let me think' },
            { type: 'text', text: 'hi there' },
          ],
        },
        timestamp: '2026-04-03T10:00:01Z',
      }),
    ]
    writeFileSync(logPath, lines.join('\n'))

    const handler = defineSessionEndHandler(mockSaveUseCase)
    await handler.handle(logPath, 'session-123', '/my/project')

    expect(mockSaveUseCase.saveConversation).toHaveBeenCalledTimes(1)
    const callArg = vi.mocked(mockSaveUseCase.saveConversation).mock.calls[0]![0]
    expect(callArg.sessionId).toBe('session-123')
    expect(callArg.messages).toHaveLength(2)
    expect(callArg.messages[0]!.role).toBe('user')
    expect(callArg.messages[0]!.content).toBe('hello')
    expect(callArg.messages[1]!.role).toBe('assistant')
    expect(callArg.messages[1]!.content).toBe('hi there')
  })

  it('should handle user messages with string content', async () => {
    const logPath = join(testDir, 'string-content.jsonl')
    const lines = [
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: 'plain text message' },
        timestamp: '2026-04-03T10:00:00Z',
      }),
    ]
    writeFileSync(logPath, lines.join('\n'))

    const handler = defineSessionEndHandler(mockSaveUseCase)
    await handler.handle(logPath, 'session-123')

    const callArg = vi.mocked(mockSaveUseCase.saveConversation).mock.calls[0]![0]
    expect(callArg.messages[0]!.content).toBe('plain text message')
  })

  it('should skip non-user/assistant entries', async () => {
    const logPath = join(testDir, 'mixed.jsonl')
    const lines = [
      JSON.stringify({ type: 'permission-mode', permissionMode: 'default' }),
      JSON.stringify({
        type: 'system',
        content: 'system message',
        timestamp: '2026-04-03T10:00:00Z',
      }),
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: 'actual user message' },
        timestamp: '2026-04-03T10:00:01Z',
      }),
    ]
    writeFileSync(logPath, lines.join('\n'))

    const handler = defineSessionEndHandler(mockSaveUseCase)
    await handler.handle(logPath, 'session-123')

    const callArg = vi.mocked(mockSaveUseCase.saveConversation).mock.calls[0]![0]
    expect(callArg.messages).toHaveLength(1)
    expect(callArg.messages[0]!.content).toBe('actual user message')
  })

  it('should handle empty log file gracefully', async () => {
    const logPath = join(testDir, 'empty.jsonl')
    writeFileSync(logPath, '')

    const handler = defineSessionEndHandler(mockSaveUseCase)
    await handler.handle(logPath, 'session-123')

    expect(mockSaveUseCase.saveConversation).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [] }),
    )
  })

  it('should skip malformed JSON lines', async () => {
    const logPath = join(testDir, 'malformed.jsonl')
    const lines = [
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: 'valid' },
        timestamp: '2026-04-03T10:00:00Z',
      }),
      'not json at all',
      JSON.stringify({
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'also valid' }] },
        timestamp: '2026-04-03T10:00:01Z',
      }),
    ]
    writeFileSync(logPath, lines.join('\n'))

    const handler = defineSessionEndHandler(mockSaveUseCase)
    await handler.handle(logPath, 'session-123')

    const callArg = vi.mocked(mockSaveUseCase.saveConversation).mock.calls[0]![0]
    expect(callArg.messages).toHaveLength(2)
  })

  it('should concatenate multiple text blocks in assistant content', async () => {
    const logPath = join(testDir, 'multi-text.jsonl')
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'first part' },
            { type: 'tool_use', name: 'some_tool' },
            { type: 'text', text: 'second part' },
          ],
        },
        timestamp: '2026-04-03T10:00:00Z',
      }),
    ]
    writeFileSync(logPath, lines.join('\n'))

    const handler = defineSessionEndHandler(mockSaveUseCase)
    await handler.handle(logPath, 'session-123')

    const callArg = vi.mocked(mockSaveUseCase.saveConversation).mock.calls[0]![0]
    expect(callArg.messages[0]!.content).toBe('first part\nsecond part')
  })
})
