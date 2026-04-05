# Epic #1: 検索精度の改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve hybrid search accuracy by leveraging pg_bigm similarity scoring, adding chunk size limits, and implementing deduplication.

**Architecture:** Three independent improvements to the search pipeline: (1) Replace LIKE with pg_bigm `show_bigm_similarity()` in storage layer for scored keyword results, (2) Add max character limit to QAChunkingStrategy with sentence-boundary splitting, (3) Add vector similarity deduplication check in SaveMemoryUseCase before persisting.

**Tech Stack:** TypeScript 5.7, PostgreSQL 16 + pg_bigm + pgvector, Drizzle ORM, Vitest, pnpm monorepo

---

## File Structure

### Task 1: pg_bigm similarity検索 (#4)

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/storage-postgres/src/postgres-storage-repository.ts:133-158` | Replace LIKE with `show_bigm_similarity()`, return actual scores |
| Modify | `packages/storage-postgres/tests/postgres-storage-repository.test.ts:172-213` | Update keyword search tests to verify scored results |
| Modify | `packages/core/tests/use-cases/search-memory.test.ts:50-56` | Update mock scores to reflect realistic bigm similarity values |

### Task 2: Q&Aチャンクサイズ制限 (#5)

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/hooks/src/qa-chunking-strategy.ts` | Add max char limit + sentence-boundary splitting |
| Modify | `packages/hooks/tests/qa-chunking-strategy.test.ts` | Add tests for chunk splitting behavior |

### Task 3: 類似度ベースの重複検出 (#6)

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/core/src/constants.ts` | Add `DEDUP_SIMILARITY_THRESHOLD` constant |
| Modify | `packages/core/src/use-cases/save-memory.ts` | Add dedup check before save |
| Modify | `packages/core/tests/use-cases/save-memory.test.ts` | Add dedup tests |

---

## Task 1: pg_bigm similarity検索への切替 (#4)

**Files:**
- Modify: `packages/storage-postgres/src/postgres-storage-repository.ts:133-158`
- Test: `packages/storage-postgres/tests/postgres-storage-repository.test.ts`

- [ ] **Step 1: Write failing test — keyword search returns scored results**

Add to `packages/storage-postgres/tests/postgres-storage-repository.test.ts`, inside the `searchByKeyword` describe block:

```typescript
it('returns results with bigm similarity scores (not uniform 1.0)', async () => {
  await repo.saveBatch([
    makeMemory({ content: 'TypeScript is a strongly typed language' }),
    makeMemory({ content: 'Python is great for data science' }),
  ])

  const results = await repo.searchByKeyword('TypeScript', 10)
  expect(results).toHaveLength(1)
  expect(results[0]!.score).toBeGreaterThan(0)
  expect(results[0]!.score).toBeLessThanOrEqual(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/storage-postgres && pnpm test -- --grep "bigm similarity scores"`
Expected: FAIL — score is 1.0 for all results (assertion `toBeLessThanOrEqual(1)` passes but LIKE returns results that don't match the expected count because pg_bigm similarity threshold filters differently)

Actually the current test will pass because LIKE `%TypeScript%` does find 1 result with score 1.0 and `1.0 <= 1` is true. We need a test that reveals the scoring problem more clearly:

Replace the test from Step 1 with:

```typescript
it('returns results ordered by bigm similarity score', async () => {
  await repo.saveBatch([
    makeMemory({ content: 'TypeScript is a strongly typed language' }),
    makeMemory({ content: 'TypeScript and JavaScript are related to TypeScript' }),
    makeMemory({ content: 'Python is great for data science' }),
  ])

  const results = await repo.searchByKeyword('TypeScript', 10)
  expect(results.length).toBeGreaterThanOrEqual(2)
  // Results should be ordered by score descending
  for (let i = 1; i < results.length; i++) {
    expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score)
  }
  // Scores should NOT all be identical
  const scores = results.map((r) => r.score)
  const uniqueScores = new Set(scores)
  expect(uniqueScores.size).toBeGreaterThan(1)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/storage-postgres && pnpm test -- --grep "ordered by bigm similarity score"`
Expected: FAIL — all scores are 1.0, so `uniqueScores.size` is 1

- [ ] **Step 4: Implement pg_bigm similarity scoring**

Replace the `searchByKeyword` method in `packages/storage-postgres/src/postgres-storage-repository.ts:133-158`:

```typescript
async searchByKeyword(
  query: string,
  limit: number,
  filter?: SearchFilter,
): Promise<SearchResult[]> {
  const conditions = [sql`${memories.content} LIKE ${'%' + query + '%'}`]

  if (filter?.projectPath) {
    conditions.push(eq(memories.projectPath, filter.projectPath))
  }
  if (filter?.source) {
    conditions.push(eq(memories.source, filter.source))
  }

  const similarityExpr = sql<number>`show_bigm_similarity(${memories.content}, ${query})`

  const rows = await this.db
    .select({
      id: memories.id,
      content: memories.content,
      embedding: memories.embedding,
      sessionId: memories.sessionId,
      projectPath: memories.projectPath,
      tags: memories.tags,
      source: memories.source,
      createdAt: memories.createdAt,
      updatedAt: memories.updatedAt,
      similarity: similarityExpr,
    })
    .from(memories)
    .where(and(...conditions))
    .orderBy(sql`${similarityExpr} DESC`)
    .limit(limit)

  return rows.map((row) => ({
    memory: toMemory(row as DbRow),
    score: row.similarity ?? 0,
    matchType: 'keyword' as const,
  }))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/storage-postgres && pnpm test -- --grep "ordered by bigm similarity score"`
Expected: PASS

- [ ] **Step 6: Run all storage-postgres tests**

Run: `cd packages/storage-postgres && pnpm test`
Expected: All tests PASS

- [ ] **Step 7: Update the existing keyword search score test**

The existing test `has matchType set to keyword` at line 201 should still pass. Verify that the `returns memories matching keyword` test still passes — LIKE is still used as the filter, bigm similarity is only for scoring.

Run: `cd packages/storage-postgres && pnpm test`
Expected: All tests PASS

- [ ] **Step 8: Run core tests (RRF integration)**

The core SearchMemoryUseCase tests mock the storage layer, so they should still pass unchanged.

Run: `cd packages/core && pnpm test`
Expected: All tests PASS

- [ ] **Step 9: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add packages/storage-postgres/src/postgres-storage-repository.ts packages/storage-postgres/tests/postgres-storage-repository.test.ts
git commit -m "feat(storage-postgres): use pg_bigm similarity scoring for keyword search

Closes #4"
```

---

## Task 2: Q&Aチャンクサイズ制限の追加 (#5)

**Files:**
- Modify: `packages/hooks/src/qa-chunking-strategy.ts`
- Test: `packages/hooks/tests/qa-chunking-strategy.test.ts`

- [ ] **Step 1: Write failing test — long chunk is split**

Add to `packages/hooks/tests/qa-chunking-strategy.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/hooks && pnpm test -- --grep "split chunks that exceed"`
Expected: FAIL — `QAChunkingStrategy` constructor doesn't accept options

- [ ] **Step 3: Write failing test — split respects sentence boundaries**

Add to `packages/hooks/tests/qa-chunking-strategy.test.ts`:

```typescript
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
  // No chunk should end mid-sentence (unless a single sentence exceeds the limit)
  for (const chunk of chunks) {
    expect(chunk.content.length).toBeLessThanOrEqual(80)
  }
})
```

- [ ] **Step 4: Write failing test — default max chunk chars**

Add to `packages/hooks/tests/qa-chunking-strategy.test.ts`:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `cd packages/hooks && pnpm test`
Expected: 3 new tests FAIL

- [ ] **Step 6: Implement chunk size limit**

Replace `packages/hooks/src/qa-chunking-strategy.ts`:

```typescript
import type { Chunk, ChunkingStrategy, ConversationLog } from '@claude-memory/core'

const DEFAULT_MAX_CHUNK_CHARS = 1000

interface QAChunkingOptions {
  maxChunkChars?: number
}

export class QAChunkingStrategy implements ChunkingStrategy {
  private readonly maxChunkChars: number

  constructor(options?: QAChunkingOptions) {
    this.maxChunkChars = options?.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS
  }

  chunk(conversation: ConversationLog): Chunk[] {
    const rawChunks = this.extractQAPairs(conversation)
    const result: Chunk[] = []

    for (const chunk of rawChunks) {
      if (chunk.content.length <= this.maxChunkChars) {
        result.push(chunk)
      } else {
        result.push(...this.splitChunk(chunk))
      }
    }

    return result
  }

  private extractQAPairs(conversation: ConversationLog): Chunk[] {
    const chunks: Chunk[] = []
    const messages = conversation.messages
    let i = 0

    while (i < messages.length) {
      const userParts: string[] = []
      while (i < messages.length && messages[i]!.role === 'user') {
        userParts.push(messages[i]!.content)
        i++
      }

      const assistantParts: string[] = []
      while (i < messages.length && messages[i]!.role === 'assistant') {
        assistantParts.push(messages[i]!.content)
        i++
      }

      if (userParts.length > 0 && assistantParts.length > 0) {
        chunks.push({
          content: `Q: ${userParts.join('\n')}\nA: ${assistantParts.join('\n')}`,
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

  private splitChunk(chunk: Chunk): Chunk[] {
    const text = chunk.content
    const sentences = this.splitIntoSentences(text)
    const result: Chunk[] = []
    let current = ''

    for (const sentence of sentences) {
      if (sentence.length > this.maxChunkChars) {
        // Single sentence exceeds limit — force split by character
        if (current.length > 0) {
          result.push({ content: current.trim(), metadata: chunk.metadata })
          current = ''
        }
        for (let j = 0; j < sentence.length; j += this.maxChunkChars) {
          const slice = sentence.slice(j, j + this.maxChunkChars)
          result.push({ content: slice, metadata: chunk.metadata })
        }
        continue
      }

      const joined = current.length > 0 ? `${current} ${sentence}` : sentence
      if (joined.length > this.maxChunkChars) {
        result.push({ content: current.trim(), metadata: chunk.metadata })
        current = sentence
      } else {
        current = joined
      }
    }

    if (current.trim().length > 0) {
      result.push({ content: current.trim(), metadata: chunk.metadata })
    }

    return result
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence-ending punctuation (Japanese and English)
    // Keep the delimiter attached to the preceding text
    return text.match(/[^。.!！?？\n]+[。.!！?？\n]?/g) ?? [text]
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd packages/hooks && pnpm test`
Expected: All tests PASS (existing + new)

- [ ] **Step 8: Update DI container (mcp-server) if needed**

Check if `QAChunkingStrategy` is instantiated without arguments in the DI container.

Read: `packages/mcp-server/src/container.ts`

The constructor now accepts optional `QAChunkingOptions`. The existing `new QAChunkingStrategy()` call still works because options are optional. No change needed.

- [ ] **Step 9: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add packages/hooks/src/qa-chunking-strategy.ts packages/hooks/tests/qa-chunking-strategy.test.ts
git commit -m "feat(hooks): add chunk size limit to QAChunkingStrategy

Default max 1000 chars. Splits at sentence boundaries (Japanese/English).
Single sentences exceeding the limit are force-split by character.

Closes #5"
```

---

## Task 3: 類似度ベースの重複検出・排除 (#6)

**Files:**
- Modify: `packages/core/src/constants.ts`
- Modify: `packages/core/src/use-cases/save-memory.ts`
- Test: `packages/core/tests/use-cases/save-memory.test.ts`

- [ ] **Step 1: Add dedup constant**

Add to `packages/core/src/constants.ts`:

```typescript
export const SEARCH_DEFAULTS = {
  rrfK: 60,
  decayHalfLifeDays: 30,
  maxResults: 20,
} as const

export const DEDUP_DEFAULTS = {
  similarityThreshold: 0.95,
} as const
```

- [ ] **Step 2: Write failing test — duplicate manual save is skipped**

Add to `packages/core/tests/use-cases/save-memory.test.ts`:

```typescript
it('should skip saving when a similar memory already exists', async () => {
  const storage = createMockStorage()
  const embedding = createMockEmbedding()
  const chunking = createMockChunking()

  // Mock: vector search returns a highly similar existing memory
  vi.mocked(storage.searchByVector).mockResolvedValue([
    {
      memory: {
        id: 'existing-id',
        content: 'very similar content',
        embedding: [0.1, 0.2, 0.3],
        metadata: { sessionId: 's0', source: 'manual' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      score: 0.96,
      matchType: 'vector',
    },
  ])

  const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
  await useCase.saveManual({
    content: 'very similar content!',
    sessionId: 'session-1',
  })

  expect(storage.searchByVector).toHaveBeenCalledWith([0.1, 0.2, 0.3], 1, undefined)
  expect(storage.save).not.toHaveBeenCalled()
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- --grep "skip saving when a similar memory"`
Expected: FAIL — `storage.save` is called (no dedup check exists)

- [ ] **Step 4: Write failing test — non-duplicate is saved normally**

Add to `packages/core/tests/use-cases/save-memory.test.ts`:

```typescript
it('should save when no similar memory exists', async () => {
  const storage = createMockStorage()
  const embedding = createMockEmbedding()
  const chunking = createMockChunking()

  // Mock: vector search returns no similar results
  vi.mocked(storage.searchByVector).mockResolvedValue([])

  const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
  await useCase.saveManual({
    content: 'unique content',
    sessionId: 'session-1',
  })

  expect(storage.save).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 5: Write failing test — low similarity result does not block save**

Add to `packages/core/tests/use-cases/save-memory.test.ts`:

```typescript
it('should save when existing memory similarity is below threshold', async () => {
  const storage = createMockStorage()
  const embedding = createMockEmbedding()
  const chunking = createMockChunking()

  vi.mocked(storage.searchByVector).mockResolvedValue([
    {
      memory: {
        id: 'existing-id',
        content: 'somewhat related content',
        embedding: [0.1, 0.2, 0.3],
        metadata: { sessionId: 's0', source: 'manual' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      score: 0.8,
      matchType: 'vector',
    },
  ])

  const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
  await useCase.saveManual({
    content: 'different content',
    sessionId: 'session-1',
  })

  expect(storage.save).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 6: Write failing test — conversation save deduplicates each chunk**

Add to `packages/core/tests/use-cases/save-memory.test.ts`:

```typescript
it('should skip duplicate chunks during conversation save', async () => {
  const storage = createMockStorage()
  const embedding = createMockEmbedding()
  const chunking = createMockChunking()

  vi.mocked(chunking.chunk).mockReturnValue([
    { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
    { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
  ])
  vi.mocked(embedding.embedBatch).mockResolvedValue([
    [0.1, 0.2, 0.3],
    [0.4, 0.5, 0.6],
  ])

  // First chunk: duplicate exists. Second chunk: no duplicate.
  vi.mocked(storage.searchByVector)
    .mockResolvedValueOnce([
      {
        memory: {
          id: 'dup',
          content: 'chunk1 dup',
          embedding: [0.1, 0.2, 0.3],
          metadata: { sessionId: 's0', source: 'auto' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        score: 0.97,
        matchType: 'vector',
      },
    ])
    .mockResolvedValueOnce([])

  const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
  const log = {
    sessionId: 's1',
    messages: [
      { role: 'user' as const, content: 'q', timestamp: new Date() },
      { role: 'assistant' as const, content: 'a', timestamp: new Date() },
    ],
  }
  await useCase.saveConversation(log)

  const savedMemories = vi.mocked(storage.saveBatch).mock.calls[0]![0]
  expect(savedMemories).toHaveLength(1)
  expect(savedMemories[0]!.content).toBe('chunk2')
})
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `cd packages/core && pnpm test -- --grep "skip|duplicate|similar"`
Expected: FAIL

- [ ] **Step 8: Implement deduplication in SaveMemoryUseCase**

Replace `packages/core/src/use-cases/save-memory.ts`:

```typescript
import { randomUUID } from 'node:crypto'
import { DEDUP_DEFAULTS } from '../constants.js'
import type { ConversationLog } from '../entities/conversation.js'
import type { Memory } from '../entities/memory.js'
import type { ChunkingStrategy } from '../interfaces/chunking-strategy.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

interface SaveManualInput {
  content: string
  sessionId: string
  projectPath?: string
  tags?: string[]
}

export class SaveMemoryUseCase {
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
    private readonly chunking: ChunkingStrategy,
  ) {}

  async saveManual(input: SaveManualInput): Promise<void> {
    const embeddingVector = await this.embedding.embed(input.content)

    if (await this.isDuplicate(embeddingVector)) return

    const now = new Date()
    const memory: Memory = {
      id: randomUUID(),
      content: input.content,
      embedding: embeddingVector,
      metadata: {
        sessionId: input.sessionId,
        projectPath: input.projectPath,
        tags: input.tags,
        source: 'manual',
      },
      createdAt: now,
      updatedAt: now,
    }
    await this.storage.save(memory)
  }

  async saveConversation(log: ConversationLog): Promise<void> {
    const chunks = this.chunking.chunk(log)
    if (chunks.length === 0) return

    const contents = chunks.map((c) => c.content)
    const embeddings = await this.embedding.embedBatch(contents)

    const now = new Date()
    const memories: Memory[] = []

    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i]
      if (!embedding || embedding.length === 0) continue

      if (await this.isDuplicate(embedding)) continue

      memories.push({
        id: randomUUID(),
        content: chunks[i]!.content,
        embedding,
        metadata: chunks[i]!.metadata,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (memories.length > 0) {
      await this.storage.saveBatch(memories)
    }
  }

  private async isDuplicate(embedding: number[]): Promise<boolean> {
    const results = await this.storage.searchByVector(embedding, 1)
    if (results.length === 0 || !results[0]) return false
    return results[0].score >= DEDUP_DEFAULTS.similarityThreshold
  }
}
```

- [ ] **Step 9: Export DEDUP_DEFAULTS from core index**

Add to `packages/core/src/index.ts`:

```typescript
export { SEARCH_DEFAULTS, DEDUP_DEFAULTS } from './constants.js'
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `cd packages/core && pnpm test`
Expected: All tests PASS

- [ ] **Step 11: Fix existing tests that don't mock searchByVector**

The existing test `should save a manual memory with embedding` does not mock `searchByVector`. It needs to be updated:

In the existing test, add before `await useCase.saveManual(...)`:
```typescript
vi.mocked(storage.searchByVector).mockResolvedValue([])
```

Do the same for `should save conversation as auto memories via chunking` and `should skip failed embeddings and save successful ones`.

- [ ] **Step 12: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 13: Commit**

```bash
git add packages/core/src/constants.ts packages/core/src/use-cases/save-memory.ts packages/core/src/index.ts packages/core/tests/use-cases/save-memory.test.ts
git commit -m "feat(core): add similarity-based deduplication on save

Skip saving when a memory with cosine similarity >= 0.95 already exists.
Applied to both manual saves and conversation auto-saves.

Closes #6"
```
