# Plan C: MCP Server + Hooks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the MCP Server that exposes 6 memory tools and the Hooks CLI for automatic session-end saving.

**Architecture:** mcp-server is the Composition Root assembling all packages. hooks depends only on core, providing Q&A chunking and session-end handling as a standalone CLI.

**Tech Stack:** @modelcontextprotocol/sdk, pino, Docker, Vitest

**Prerequisites:** Plan A (core) + Plan B (embedding-onnx, storage-postgres) complete

**Blocks:** None (final application plan)

---

## File Structure

```
packages/
├── mcp-server/
│   ├── src/
│   │   ├── config.ts
│   │   ├── container.ts
│   │   ├── tools/
│   │   │   ├── memory-save.ts
│   │   │   ├── memory-search.ts
│   │   │   ├── memory-delete.ts
│   │   │   ├── memory-list.ts
│   │   │   ├── memory-stats.ts
│   │   │   └── memory-clear.ts
│   │   ├── server.ts
│   │   └── index.ts
│   ├── tests/
│   │   ├── tools/
│   │   │   ├── memory-save.test.ts
│   │   │   ├── memory-search.test.ts
│   │   │   └── memory-crud.test.ts
│   │   └── e2e.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── hooks/
│   ├── src/
│   │   ├── qa-chunking-strategy.ts
│   │   ├── session-end-handler.ts
│   │   └── index.ts
│   ├── tests/
│   │   ├── qa-chunking-strategy.test.ts
│   │   └── session-end-handler.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
docker-compose.yml
Dockerfile
```

---

# Part 1: hooks Package

## Task 1: Scaffold hooks Package

**Files:**
- Create: `packages/hooks/package.json`, `tsconfig.json`, `vitest.config.ts`

- [ ] **Step 1: Create directory**

```bash
mkdir -p packages/hooks/src packages/hooks/tests
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@claude-memory/hooks",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "claude-memory-hooks": "dist/index.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@claude-memory/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "5.7.3",
    "vitest": "3.1.1",
    "@vitest/coverage-v8": "3.1.1"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        branches: 75,
        functions: 75,
        lines: 75,
        statements: 75,
      },
    },
  },
})
```

- [ ] **Step 5: Install and commit**

```bash
pnpm install
git add packages/hooks/
git commit -m "chore(hooks): scaffold hooks package"
```

---

## Task 2: QAChunkingStrategy (TDD)

**Files:**
- Create: `packages/hooks/src/qa-chunking-strategy.ts`
- Test: `packages/hooks/tests/qa-chunking-strategy.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/hooks/tests/qa-chunking-strategy.test.ts
import { describe, expect, it } from 'vitest'
import { QAChunkingStrategy } from '../src/qa-chunking-strategy.js'
import type { ConversationLog } from '@claude-memory/core'

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
    expect(chunks).toHaveLength(1) // trailing user message is dropped
  })

  it('should return empty array for empty conversation', () => {
    const log: ConversationLog = { sessionId: 's1', messages: [] }
    const chunks = strategy.chunk(log)
    expect(chunks).toHaveLength(0)
  })

  it('should skip consecutive same-role messages', () => {
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
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/hooks && pnpm test
```

- [ ] **Step 3: Implement QAChunkingStrategy**

```typescript
// packages/hooks/src/qa-chunking-strategy.ts
import type { ChunkingStrategy, ConversationLog, Chunk } from '@claude-memory/core'

export class QAChunkingStrategy implements ChunkingStrategy {
  chunk(conversation: ConversationLog): Chunk[] {
    const chunks: Chunk[] = []
    const messages = conversation.messages

    let i = 0
    while (i < messages.length) {
      // Collect consecutive user messages
      const userParts: string[] = []
      while (i < messages.length && messages[i]!.role === 'user') {
        userParts.push(messages[i]!.content)
        i++
      }

      // Collect consecutive assistant messages
      const assistantParts: string[] = []
      while (i < messages.length && messages[i]!.role === 'assistant') {
        assistantParts.push(messages[i]!.content)
        i++
      }

      // Only create chunk if we have both Q and A
      if (userParts.length > 0 && assistantParts.length > 0) {
        const content = `Q: ${userParts.join('\n')}\nA: ${assistantParts.join('\n')}`
        chunks.push({
          content,
          metadata: {
            sessionId: conversation.sessionId,
            projectPath: conversation.projectPath,
            source: 'auto',
          },
        })
      }
    }

    return chunks
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/hooks && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/hooks/src/qa-chunking-strategy.ts packages/hooks/tests/qa-chunking-strategy.test.ts
git commit -m "feat(hooks): implement QAChunkingStrategy"
```

---

## Task 3: SessionEndHandler (TDD)

**Files:**
- Create: `packages/hooks/src/session-end-handler.ts`
- Test: `packages/hooks/tests/session-end-handler.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/hooks/tests/session-end-handler.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SessionEndHandler } from '../src/session-end-handler.js'
import type { SaveMemoryUseCase } from '@claude-memory/core'
import { QAChunkingStrategy } from '../src/qa-chunking-strategy.js'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('SessionEndHandler', () => {
  const testDir = join(tmpdir(), 'claude-memory-test-' + Date.now())
  let mockSaveUseCase: SaveMemoryUseCase

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
    mockSaveUseCase = {
      saveManual: vi.fn(),
      saveConversation: vi.fn(),
    } as any
  })

  it('should parse JSONL log and call saveConversation', async () => {
    const logPath = join(testDir, 'conversation.jsonl')
    const lines = [
      JSON.stringify({ role: 'user', content: 'hello', timestamp: '2026-04-03T10:00:00Z' }),
      JSON.stringify({ role: 'assistant', content: 'hi there', timestamp: '2026-04-03T10:00:01Z' }),
    ]
    writeFileSync(logPath, lines.join('\n'))

    const handler = new SessionEndHandler(
      new QAChunkingStrategy(),
      mockSaveUseCase,
    )
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

    const handler = new SessionEndHandler(
      new QAChunkingStrategy(),
      mockSaveUseCase,
    )
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
      JSON.stringify({ role: 'assistant', content: 'also valid', timestamp: '2026-04-03T10:00:01Z' }),
    ]
    writeFileSync(logPath, lines.join('\n'))

    const handler = new SessionEndHandler(
      new QAChunkingStrategy(),
      mockSaveUseCase,
    )
    await handler.handle(logPath, 'session-123')

    const callArg = vi.mocked(mockSaveUseCase.saveConversation).mock.calls[0]![0]
    expect(callArg.messages).toHaveLength(2) // malformed line skipped
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/hooks && pnpm test
```

- [ ] **Step 3: Implement SessionEndHandler**

```typescript
// packages/hooks/src/session-end-handler.ts
import { readFileSync } from 'node:fs'
import type { ChunkingStrategy, SaveMemoryUseCase, ConversationLog, ConversationMessage } from '@claude-memory/core'

interface RawLogEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export class SessionEndHandler {
  constructor(
    private readonly chunking: ChunkingStrategy,
    private readonly saveUseCase: SaveMemoryUseCase,
  ) {}

  async handle(
    conversationLogPath: string,
    sessionId: string,
    projectPath?: string,
  ): Promise<void> {
    const messages = this.parseLog(conversationLogPath)
    const log: ConversationLog = { sessionId, projectPath, messages }
    await this.saveUseCase.saveConversation(log)
  }

  private parseLog(filePath: string): ConversationMessage[] {
    const content = readFileSync(filePath, 'utf-8').trim()
    if (!content) return []

    const messages: ConversationMessage[] = []
    for (const line of content.split('\n')) {
      try {
        const entry = JSON.parse(line) as RawLogEntry
        if (entry.role && entry.content) {
          messages.push({
            role: entry.role,
            content: entry.content,
            timestamp: new Date(entry.timestamp),
          })
        }
      } catch {
        // skip malformed lines
      }
    }
    return messages
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/hooks && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/hooks/src/session-end-handler.ts packages/hooks/tests/session-end-handler.test.ts
git commit -m "feat(hooks): implement SessionEndHandler with JSONL parsing"
```

---

## Task 4: Hooks CLI Entry Point

**Files:**
- Create: `packages/hooks/src/index.ts`

- [ ] **Step 1: Create CLI entry point**

```typescript
#!/usr/bin/env node
// packages/hooks/src/index.ts
export { QAChunkingStrategy } from './qa-chunking-strategy.js'
export { SessionEndHandler } from './session-end-handler.js'

// CLI usage: claude-memory-hooks <log-path> <session-id> [project-path]
// Actual CLI wiring is done by mcp-server package which has access to all dependencies
```

- [ ] **Step 2: Build and verify**

```bash
cd packages/hooks && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add packages/hooks/src/index.ts
git commit -m "feat(hooks): add package exports"
```

---

# Part 2: mcp-server Package

## Task 5: Scaffold mcp-server Package

**Files:**
- Create: `packages/mcp-server/package.json`, `tsconfig.json`, `vitest.config.ts`

- [ ] **Step 1: Create directory**

```bash
mkdir -p packages/mcp-server/src/tools packages/mcp-server/tests/tools
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@claude-memory/mcp-server",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "claude-memory-server": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@claude-memory/core": "workspace:*",
    "@claude-memory/embedding-onnx": "workspace:*",
    "@claude-memory/storage-postgres": "workspace:*",
    "@claude-memory/hooks": "workspace:*",
    "@modelcontextprotocol/sdk": "1.12.1",
    "pino": "9.6.0",
    "pino-pretty": "13.0.0"
  },
  "devDependencies": {
    "typescript": "5.7.3",
    "vitest": "3.1.1",
    "@vitest/coverage-v8": "3.1.1"
  }
}
```

- [ ] **Step 3: Create tsconfig.json and vitest.config.ts**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

```typescript
// packages/mcp-server/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        branches: 75,
        functions: 75,
        lines: 75,
        statements: 75,
      },
    },
  },
})
```

- [ ] **Step 4: Install and commit**

```bash
pnpm install
git add packages/mcp-server/
git commit -m "chore(mcp-server): scaffold MCP server package"
```

---

## Task 6: Config + DI Container

**Files:**
- Create: `packages/mcp-server/src/config.ts`, `packages/mcp-server/src/container.ts`

- [ ] **Step 1: Create config**

```typescript
// packages/mcp-server/src/config.ts
export interface AppConfig {
  databaseUrl: string
  embeddingModel: string
  embeddingDimension: number
  logLevel: string
}

export function loadConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required')

  return {
    databaseUrl,
    embeddingModel: process.env.EMBEDDING_MODEL ?? 'intfloat/multilingual-e5-small',
    embeddingDimension: Number(process.env.EMBEDDING_DIMENSION ?? '384'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  }
}
```

- [ ] **Step 2: Create DI container**

```typescript
// packages/mcp-server/src/container.ts
import {
  SaveMemoryUseCase,
  SearchMemoryUseCase,
  DeleteMemoryUseCase,
  ListMemoriesUseCase,
  GetStatsUseCase,
  ClearMemoryUseCase,
} from '@claude-memory/core'
import { OnnxEmbeddingProvider } from '@claude-memory/embedding-onnx'
import { PostgresStorageRepository } from '@claude-memory/storage-postgres'
import { QAChunkingStrategy } from '@claude-memory/hooks'
import type { AppConfig } from './config.js'

export function createContainer(config: AppConfig) {
  const storage = new PostgresStorageRepository(config.databaseUrl)
  const embedding = new OnnxEmbeddingProvider({ modelName: config.embeddingModel })
  const chunking = new QAChunkingStrategy()

  return {
    storage,
    embedding,
    chunking,
    saveMemory: new SaveMemoryUseCase(storage, embedding, chunking),
    searchMemory: new SearchMemoryUseCase(storage, embedding),
    deleteMemory: new DeleteMemoryUseCase(storage),
    listMemories: new ListMemoriesUseCase(storage),
    getStats: new GetStatsUseCase(storage),
    clearMemory: new ClearMemoryUseCase(storage),
  }
}

export type Container = ReturnType<typeof createContainer>
```

- [ ] **Step 3: Commit**

```bash
git add packages/mcp-server/src/config.ts packages/mcp-server/src/container.ts
git commit -m "feat(mcp-server): add config and DI container"
```

---

## Task 7: MCP Tools (TDD)

**Files:**
- Create: `packages/mcp-server/src/tools/*.ts`
- Test: `packages/mcp-server/tests/tools/*.test.ts`

- [ ] **Step 1: Write failing test for memory-save tool**

```typescript
// packages/mcp-server/tests/tools/memory-save.test.ts
import { describe, expect, it, vi } from 'vitest'
import { registerSaveTool } from '../../src/tools/memory-save.js'

describe('memory_save tool', () => {
  it('should call saveMemory.saveManual with correct args', async () => {
    const mockContainer = {
      saveMemory: { saveManual: vi.fn(), saveConversation: vi.fn() },
    }
    const tools: any[] = []
    const mockServer = {
      tool: (name: string, schema: any, handler: any) => tools.push({ name, schema, handler }),
    }

    registerSaveTool(mockServer as any, mockContainer as any)

    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('memory_save')

    await tools[0].handler({
      content: 'remember this',
      sessionId: 'session-1',
      projectPath: '/project',
    })

    expect(mockContainer.saveMemory.saveManual).toHaveBeenCalledWith({
      content: 'remember this',
      sessionId: 'session-1',
      projectPath: '/project',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/mcp-server && pnpm test
```

- [ ] **Step 3: Implement all 6 MCP tools**

```typescript
// packages/mcp-server/src/tools/memory-save.ts
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Container } from '../container.js'

export function registerSaveTool(server: McpServer, container: Container) {
  server.tool(
    'memory_save',
    {
      content: z.string().min(1).describe('保存する内容'),
      sessionId: z.string().describe('セッションID'),
      projectPath: z.string().optional().describe('プロジェクトパス'),
      tags: z.array(z.string()).optional().describe('タグ'),
    },
    async (args) => {
      await container.saveMemory.saveManual(args)
      return { content: [{ type: 'text' as const, text: 'Memory saved successfully.' }] }
    },
  )
}
```

```typescript
// packages/mcp-server/src/tools/memory-search.ts
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Container } from '../container.js'

export function registerSearchTool(server: McpServer, container: Container) {
  server.tool(
    'memory_search',
    {
      query: z.string().min(1).describe('検索クエリ'),
      limit: z.number().optional().default(20).describe('取得件数'),
      projectPath: z.string().optional().describe('プロジェクトパスでフィルタ'),
    },
    async (args) => {
      const filter = args.projectPath ? { projectPath: args.projectPath } : undefined
      const results = await container.searchMemory.search(args.query, args.limit, filter)
      const text = results
        .map((r) => `[${r.matchType}] (score: ${r.score.toFixed(3)}) ${r.memory.content}`)
        .join('\n\n')
      return { content: [{ type: 'text' as const, text: text || 'No memories found.' }] }
    },
  )
}
```

```typescript
// packages/mcp-server/src/tools/memory-delete.ts
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Container } from '../container.js'

export function registerDeleteTool(server: McpServer, container: Container) {
  server.tool(
    'memory_delete',
    { id: z.string().uuid().describe('削除するメモリのID') },
    async (args) => {
      await container.deleteMemory.execute(args.id)
      return { content: [{ type: 'text' as const, text: `Memory ${args.id} deleted.` }] }
    },
  )
}
```

```typescript
// packages/mcp-server/src/tools/memory-list.ts
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Container } from '../container.js'

export function registerListTool(server: McpServer, container: Container) {
  server.tool(
    'memory_list',
    {
      limit: z.number().optional().default(20).describe('取得件数'),
      offset: z.number().optional().default(0).describe('オフセット'),
      source: z.enum(['manual', 'auto']).optional().describe('ソースフィルタ'),
    },
    async (args) => {
      const memories = await container.listMemories.execute({
        limit: args.limit,
        offset: args.offset,
        source: args.source,
      })
      const text = memories
        .map((m) => `[${m.id}] (${m.metadata.source}) ${m.content.slice(0, 100)}...`)
        .join('\n')
      return { content: [{ type: 'text' as const, text: text || 'No memories found.' }] }
    },
  )
}
```

```typescript
// packages/mcp-server/src/tools/memory-stats.ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Container } from '../container.js'

export function registerStatsTool(server: McpServer, container: Container) {
  server.tool('memory_stats', {}, async () => {
    const stats = await container.getStats.execute()
    const text = [
      `Total memories: ${stats.totalMemories}`,
      `Total sessions: ${stats.totalSessions}`,
      `Oldest: ${stats.oldestMemory?.toISOString() ?? 'N/A'}`,
      `Newest: ${stats.newestMemory?.toISOString() ?? 'N/A'}`,
      `Avg content length: ${Math.round(stats.averageContentLength)} chars`,
    ].join('\n')
    return { content: [{ type: 'text' as const, text }] }
  })
}
```

```typescript
// packages/mcp-server/src/tools/memory-clear.ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Container } from '../container.js'

export function registerClearTool(server: McpServer, container: Container) {
  server.tool('memory_clear', {}, async () => {
    await container.clearMemory.execute()
    return { content: [{ type: 'text' as const, text: 'All memories cleared.' }] }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/mcp-server && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/tools/ packages/mcp-server/tests/
git commit -m "feat(mcp-server): implement 6 MCP tools"
```

---

## Task 8: MCP Server Bootstrap

**Files:**
- Create: `packages/mcp-server/src/server.ts`, `packages/mcp-server/src/index.ts`

- [ ] **Step 1: Create server setup**

```typescript
// packages/mcp-server/src/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import pino from 'pino'
import { loadConfig } from './config.js'
import { createContainer } from './container.js'
import { registerSaveTool } from './tools/memory-save.js'
import { registerSearchTool } from './tools/memory-search.js'
import { registerDeleteTool } from './tools/memory-delete.js'
import { registerListTool } from './tools/memory-list.js'
import { registerStatsTool } from './tools/memory-stats.js'
import { registerClearTool } from './tools/memory-clear.js'

export async function startServer() {
  const config = loadConfig()
  const logger = pino({ level: config.logLevel })

  logger.info('Starting claude-memory MCP server...')

  const container = createContainer(config)
  const server = new McpServer({
    name: 'claude-memory',
    version: '0.0.1',
  })

  registerSaveTool(server, container)
  registerSearchTool(server, container)
  registerDeleteTool(server, container)
  registerListTool(server, container)
  registerStatsTool(server, container)
  registerClearTool(server, container)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  logger.info('claude-memory MCP server running on stdio')
}
```

```typescript
#!/usr/bin/env node
// packages/mcp-server/src/index.ts
import { startServer } from './server.js'

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Build and verify**

```bash
cd packages/mcp-server && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add packages/mcp-server/src/server.ts packages/mcp-server/src/index.ts
git commit -m "feat(mcp-server): add server bootstrap with stdio transport"
```

---

## Task 9: Docker Production Setup

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
# Dockerfile
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/ packages/

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

WORKDIR /app
COPY --from=builder /app .

CMD ["node", "packages/mcp-server/dist/index.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
# docker-compose.yml
services:
  db:
    build:
      context: .
      dockerfile: Dockerfile.db
    environment:
      POSTGRES_DB: claude_memory
      POSTGRES_USER: memory
      POSTGRES_PASSWORD: memory  # ローカル開発専用。本番では .env で上書き
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U memory -d claude_memory"]
      interval: 5s
      timeout: 5s
      retries: 5

  mcp-server:
    build: .
    depends_on:
      db:
        condition: service_healthy
    env_file: .env
    environment:
      DATABASE_URL: postgresql://memory:memory@db:5432/claude_memory
      EMBEDDING_MODEL: intfloat/multilingual-e5-small
      EMBEDDING_DIMENSION: "384"

volumes:
  pgdata:
```

- [ ] **Step 3: Verify build**

```bash
docker compose build
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml
git commit -m "feat: add Docker production setup (Dockerfile + docker-compose.yml)"
```

---

## Task 10: Claude Code Integration Docs

- [ ] **Step 1: Update CLAUDE.md with integration instructions**

Add to CLAUDE.md:

```markdown
## Claude Code Integration

### MCP Server (settings.json)
\```json
{
  "mcpServers": {
    "claude-memory": {
      "command": "docker",
      "args": ["exec", "claude-memory-mcp-server-1", "node", "packages/mcp-server/dist/index.js"]
    }
  }
}
\```

### Hooks (settings.json)
\```json
{
  "hooks": {
    "PostSessionEnd": [{
      "command": "docker exec claude-memory-mcp-server-1 node packages/hooks/dist/index.js"
    }]
  }
}
\```
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Claude Code integration instructions"
```
