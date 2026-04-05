# Epic #2: 機能拡充 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance MCP tools with tag filtering, memory update, project scoping, batch embedding optimization, and correct nullable embedding type.

**Architecture:** Five independent changes: (1) Add tags filter to search/list queries, (2) Add UpdateMemoryUseCase + MCP tool, (3) Default projectPath scoping in search, (4) Optimize embedBatch with parallel processing, (5) Change Memory.embedding from `number[]` to `number[] | null` for list operations.

**Tech Stack:** TypeScript 5.7, PostgreSQL 16 + pgvector + pg_bigm, Drizzle ORM, Vitest, pnpm monorepo

---

## Task Order

Execution order chosen to minimize conflicts:
1. **Task 1: #11** — embedding型修正（他タスクが依存しうる型変更を先に）
2. **Task 2: #7** — タグベース検索
3. **Task 3: #8** — memory_update
4. **Task 4: #9** — projectPathデフォルトスコープ
5. **Task 5: #10** — embedBatch並列処理

---

## Task 1: listのembedding返却型をOptionalに修正 (#11)

**Branch:** `feat/11-nullable-embedding`

**Files:**
- Modify: `packages/core/src/entities/memory.ts:3` — `embedding: number[]` → `number[] | null`
- Modify: `packages/storage-postgres/src/postgres-storage-repository.ts:20` — return `null` instead of `[]`
- Modify: `packages/mcp-server/src/tools/memory-list.ts` — no change needed (doesn't display embedding)
- Test: `packages/core/tests/entities/memory.test.ts`
- Test: `packages/storage-postgres/tests/postgres-storage-repository.test.ts`

- [ ] **Step 1: Write failing test — list returns null embedding**

Add to `packages/storage-postgres/tests/postgres-storage-repository.test.ts` inside the `list` describe block:

```typescript
it('returns null embedding for listed memories', async () => {
  await repo.save(makeMemory())
  const results = await repo.list({ limit: 10, offset: 0 })
  expect(results[0]!.embedding).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/storage-postgres && pnpm test -- --grep "null embedding"`
Expected: FAIL — embedding is `[]` not `null`

- [ ] **Step 3: Change Memory entity type**

In `packages/core/src/entities/memory.ts`, change line 5:

```typescript
  /** ベクトル表現。list取得時はnull（大きなペイロードのため） */
  embedding: number[] | null
```

- [ ] **Step 4: Update toMemory to return null**

In `packages/storage-postgres/src/postgres-storage-repository.ts`, change line 20:

```typescript
    embedding: null, // not fetched in list/findById (large payload)
```

- [ ] **Step 5: Fix type errors across codebase**

The `embedding: number[]` is used in `save-memory.ts` and `search-memory.ts` — these create Memory objects with actual embeddings, so they're fine. The `toMemoryWithEmbedding` still returns `number[]` which is assignable to `number[] | null`.

Check for any code that reads `memory.embedding` without null check. The `save()` method in `postgres-storage-repository.ts` uses `memory.embedding.join(',')` — this needs a null guard:

```typescript
async save(memory: Memory): Promise<void> {
  if (!memory.embedding) throw new Error('Cannot save memory without embedding')
  const embeddingLiteral = `[${memory.embedding.join(',')}]`
```

- [ ] **Step 6: Run tests**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```
git commit -m "refactor(core): change Memory.embedding to number[] | null

list/findById returns null embedding (not fetched for performance).
save/search paths still provide actual embedding vectors.

Closes #11"
```

---

## Task 2: タグベース検索・フィルタの実装 (#7)

**Branch:** `feat/7-tag-filter`

**Files:**
- Modify: `packages/core/src/entities/search-result.ts` — add `tags` to `SearchFilter`
- Modify: `packages/core/src/entities/memory.ts` — add `tags` to `ListOptions`
- Modify: `packages/storage-postgres/src/postgres-storage-repository.ts` — add tags filter to queries
- Modify: `packages/mcp-server/src/tools/memory-search.ts` — add tags argument
- Modify: `packages/mcp-server/src/tools/memory-list.ts` — add tags argument
- Test: `packages/storage-postgres/tests/postgres-storage-repository.test.ts`

- [ ] **Step 1: Add tags to SearchFilter**

In `packages/core/src/entities/search-result.ts`:

```typescript
export interface SearchFilter {
  projectPath?: string
  source?: 'manual' | 'auto'
  tags?: string[]
}
```

- [ ] **Step 2: Add tags to ListOptions**

In `packages/core/src/entities/memory.ts`, add to `ListOptions`:

```typescript
export interface ListOptions {
  limit: number
  offset: number
  source?: 'manual' | 'auto'
  sessionId?: string
  tags?: string[]
  sortBy?: 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}
```

- [ ] **Step 3: Write failing test — searchByKeyword filters by tags**

Add to `packages/storage-postgres/tests/postgres-storage-repository.test.ts` in `searchByKeyword` block:

```typescript
it('filters by tags', async () => {
  await repo.saveBatch([
    makeMemory({
      content: 'TypeScript with tag',
      metadata: { sessionId: 's1', tags: ['frontend', 'typescript'], source: 'manual' },
    }),
    makeMemory({
      content: 'TypeScript without tag',
      metadata: { sessionId: 's1', tags: ['backend'], source: 'manual' },
    }),
  ])

  const results = await repo.searchByKeyword('TypeScript', 10, { tags: ['frontend'] })
  expect(results).toHaveLength(1)
  expect(results[0]!.memory.metadata.tags).toContain('frontend')
})
```

- [ ] **Step 4: Write failing test — list filters by tags**

Add to `packages/storage-postgres/tests/postgres-storage-repository.test.ts` in `list` block:

```typescript
it('filters by tags', async () => {
  await repo.saveBatch([
    makeMemory({ metadata: { sessionId: 's1', tags: ['design'], source: 'manual' } }),
    makeMemory({ metadata: { sessionId: 's1', tags: ['bug'], source: 'manual' } }),
    makeMemory({ metadata: { sessionId: 's1', tags: ['design', 'bug'], source: 'manual' } }),
  ])

  const results = await repo.list({ limit: 10, offset: 0, tags: ['design'] })
  expect(results).toHaveLength(2)
})
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `cd packages/storage-postgres && pnpm test`
Expected: New tests FAIL

- [ ] **Step 6: Implement tags filter in PostgresStorageRepository**

In `searchByKeyword` and `searchByVector`, add after existing filter conditions:

```typescript
if (filter?.tags && filter.tags.length > 0) {
  conditions.push(sql`${memories.tags} && ${filter.tags}`)
}
```

In `list`, add after existing conditions:

```typescript
if (tags && tags.length > 0) {
  conditions.push(sql`${memories.tags} && ${tags}`)
}
```

The `&&` is PostgreSQL's array overlap operator — returns true if arrays share any element.

Destructure `tags` from options in list: `const { limit, offset, source, sessionId, tags, sortBy = 'createdAt', sortOrder = 'desc' } = options`

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd packages/storage-postgres && pnpm test`
Expected: All PASS

- [ ] **Step 8: Add tags to MCP tools**

In `packages/mcp-server/src/tools/memory-search.ts`:

```typescript
{
  query: z.string().min(1),
  limit: z.number().optional().default(20),
  projectPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
},
async (args) => {
  const filter = {
    ...(args.projectPath && { projectPath: args.projectPath }),
    ...(args.tags && { tags: args.tags }),
  }
  const results = await container.searchMemory.search(
    args.query,
    args.limit,
    Object.keys(filter).length > 0 ? filter : undefined,
  )
```

In `packages/mcp-server/src/tools/memory-list.ts`:

```typescript
{
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
  source: z.enum(['manual', 'auto']).optional(),
  tags: z.array(z.string()).optional(),
},
async (args) => {
  const memories = await container.listMemories.execute({
    limit: args.limit,
    offset: args.offset,
    source: args.source,
    tags: args.tags,
  })
```

- [ ] **Step 9: Run full test suite**

Run: `pnpm test`
Expected: All PASS

- [ ] **Step 10: Commit**

```
git commit -m "feat(storage-postgres): add tags filter to search and list

Uses PostgreSQL array overlap operator (&&) for tag matching.
Added tags argument to memory_search and memory_list MCP tools.

Closes #7"
```

---

## Task 3: memory_updateツールの追加 (#8)

**Branch:** `feat/8-memory-update`

**Files:**
- Create: `packages/core/src/use-cases/update-memory.ts`
- Modify: `packages/core/src/use-cases/index.ts` — export UpdateMemoryUseCase
- Modify: `packages/core/src/index.ts` — export UpdateMemoryUseCase
- Modify: `packages/core/src/interfaces/storage-repository.ts` — add `update` method (optional, can reuse save)
- Create: `packages/mcp-server/src/tools/memory-update.ts`
- Modify: `packages/mcp-server/src/server.ts` — register new tool
- Modify: `packages/mcp-server/src/container.ts` — add updateMemory to container
- Test: `packages/core/tests/use-cases/update-memory.test.ts`

- [ ] **Step 1: Write failing tests for UpdateMemoryUseCase**

Create `packages/core/tests/use-cases/update-memory.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type { EmbeddingProvider } from '../../src/interfaces/embedding-provider.js'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import { UpdateMemoryUseCase } from '../../src/use-cases/update-memory.js'

function createMockStorage(): StorageRepository {
  return {
    save: vi.fn(),
    saveBatch: vi.fn(),
    findById: vi.fn(),
    searchByKeyword: vi.fn(),
    searchByVector: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn(),
  }
}

function createMockEmbedding(): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    embedBatch: vi.fn(),
    getDimension: vi.fn().mockReturnValue(384),
  }
}

describe('UpdateMemoryUseCase', () => {
  it('should update content and re-embed', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const existing = {
      id: 'mem-1',
      content: 'old content',
      embedding: [0.5, 0.6, 0.7],
      metadata: { sessionId: 's1', tags: ['old'], source: 'manual' as const },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    }
    vi.mocked(storage.findById).mockResolvedValue(existing)

    const useCase = new UpdateMemoryUseCase(storage, embedding)
    await useCase.execute({ id: 'mem-1', content: 'new content' })

    expect(embedding.embed).toHaveBeenCalledWith('new content')
    expect(storage.save).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(storage.save).mock.calls[0]![0]
    expect(saved.content).toBe('new content')
    expect(saved.embedding).toEqual([0.1, 0.2, 0.3])
    expect(saved.createdAt).toEqual(new Date('2026-01-01'))
    expect(saved.updatedAt.getTime()).toBeGreaterThan(existing.updatedAt.getTime())
  })

  it('should update tags without re-embedding', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const existing = {
      id: 'mem-1',
      content: 'same content',
      embedding: [0.5, 0.6, 0.7],
      metadata: { sessionId: 's1', tags: ['old'], source: 'manual' as const },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    }
    vi.mocked(storage.findById).mockResolvedValue(existing)

    const useCase = new UpdateMemoryUseCase(storage, embedding)
    await useCase.execute({ id: 'mem-1', tags: ['new-tag'] })

    expect(embedding.embed).not.toHaveBeenCalled()
    const saved = vi.mocked(storage.save).mock.calls[0]![0]
    expect(saved.content).toBe('same content')
    expect(saved.metadata.tags).toEqual(['new-tag'])
    expect(saved.embedding).toEqual([0.5, 0.6, 0.7])
  })

  it('should throw MemoryNotFoundError for non-existent ID', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    vi.mocked(storage.findById).mockResolvedValue(null)

    const useCase = new UpdateMemoryUseCase(storage, embedding)
    await expect(useCase.execute({ id: 'missing', content: 'x' })).rejects.toThrow('MEMORY_NOT_FOUND')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- --grep "UpdateMemoryUseCase"`
Expected: FAIL — module not found

- [ ] **Step 3: Implement UpdateMemoryUseCase**

Create `packages/core/src/use-cases/update-memory.ts`:

```typescript
import { MemoryNotFoundError } from '../errors/memory-error.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

interface UpdateMemoryInput {
  id: string
  content?: string
  tags?: string[]
}

export class UpdateMemoryUseCase {
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  async execute(input: UpdateMemoryInput): Promise<void> {
    const existing = await this.storage.findById(input.id)
    if (!existing) throw new MemoryNotFoundError(input.id)

    const contentChanged = input.content !== undefined && input.content !== existing.content
    const newEmbedding = contentChanged
      ? await this.embedding.embed(input.content!)
      : existing.embedding

    await this.storage.save({
      ...existing,
      content: input.content ?? existing.content,
      embedding: newEmbedding,
      metadata: {
        ...existing.metadata,
        tags: input.tags ?? existing.metadata.tags,
      },
      updatedAt: new Date(),
    })
  }
}
```

- [ ] **Step 4: Export from core**

Add to `packages/core/src/use-cases/index.ts`:
```typescript
export { UpdateMemoryUseCase } from './update-memory.js'
```

Add to `packages/core/src/index.ts` exports:
```typescript
  UpdateMemoryUseCase,
```

- [ ] **Step 5: Run tests**

Run: `cd packages/core && pnpm test`
Expected: All PASS

- [ ] **Step 6: Add MCP tool and wire container**

Create `packages/mcp-server/src/tools/memory-update.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Container } from '../container.js'

export function registerMemoryUpdateTool(server: McpServer, container: Container): void {
  server.tool(
    'memory_update',
    'Update an existing memory (content and/or tags)',
    {
      id: z.string().uuid(),
      content: z.string().min(1).optional(),
      tags: z.array(z.string()).optional(),
    },
    async (args) => {
      await container.updateMemory.execute(args)
      return {
        content: [{ type: 'text', text: `Memory ${args.id} updated.` }],
      }
    },
  )
}
```

In `packages/mcp-server/src/container.ts`, add:
```typescript
import { UpdateMemoryUseCase } from '@claude-memory/core'
// ...
updateMemory: new UpdateMemoryUseCase(storage, embedding),
```

In `packages/mcp-server/src/server.ts`, register the tool (follow existing pattern).

- [ ] **Step 7: Build and run full test suite**

Run: `pnpm build && pnpm test`
Expected: All PASS

- [ ] **Step 8: Commit**

```
git commit -m "feat(core): add UpdateMemoryUseCase and memory_update MCP tool

Content changes trigger re-embedding. Tag-only updates skip embedding.
Throws MemoryNotFoundError for non-existent IDs.

Closes #8"
```

---

## Task 4: projectPathデフォルトスコープの実装 (#9)

**Branch:** `feat/9-project-scope`

**Files:**
- Modify: `packages/mcp-server/src/tools/memory-search.ts` — default projectPath behavior
- Modify: `packages/mcp-server/src/tools/memory-save.ts` — ensure projectPath is saved
- Test: `packages/core/tests/use-cases/search-memory.test.ts`

- [ ] **Step 1: Modify memory_search MCP tool**

In `packages/mcp-server/src/tools/memory-search.ts`, change schema and handler:

```typescript
{
  query: z.string().min(1),
  limit: z.number().optional().default(20),
  projectPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
  allProjects: z.boolean().optional().default(false).describe('Search across all projects. Default: scoped to projectPath.'),
},
async (args) => {
  const filter: Record<string, unknown> = {}
  if (!args.allProjects && args.projectPath) {
    filter.projectPath = args.projectPath
  }
  if (args.tags) {
    filter.tags = args.tags
  }
  const results = await container.searchMemory.search(
    args.query,
    args.limit,
    Object.keys(filter).length > 0 ? filter as any : undefined,
  )
```

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: All PASS

- [ ] **Step 3: Commit**

```
git commit -m "feat(mcp-server): add allProjects flag to memory_search

When allProjects=false (default), search is scoped to projectPath.
When allProjects=true, search spans all projects.

Closes #9"
```

---

## Task 5: embedBatchの並列処理化 (#10)

**Branch:** `feat/10-parallel-embed-batch`

**Files:**
- Modify: `packages/embedding-onnx/src/onnx-embedding-provider.ts:34-42`
- Test: `packages/embedding-onnx/tests/onnx-embedding-provider.test.ts`

- [ ] **Step 1: Write failing test — batch is faster than sequential**

This is hard to test directly. Instead, test that batch produces correct results:

Add to `packages/embedding-onnx/tests/onnx-embedding-provider.test.ts`:

```typescript
it('embedBatch should produce same results as individual embed calls', async () => {
  const texts = ['hello', 'world']
  const [single1, single2] = await Promise.all([
    provider.embed('hello'),
    provider.embed('world'),
  ])
  const batch = await provider.embedBatch(texts)
  expect(batch).toHaveLength(2)
  expect(batch[0]).toEqual(single1)
  expect(batch[1]).toEqual(single2)
})
```

- [ ] **Step 2: Implement parallel embedBatch**

Replace `embedBatch` in `packages/embedding-onnx/src/onnx-embedding-provider.ts`:

```typescript
async embedBatch(texts: string[]): Promise<number[][]> {
  const extractor = await this.getExtractor()
  const results = await Promise.all(
    texts.map(async (text) => {
      const output = await extractor(text, { pooling: 'mean', normalize: true })
      return Array.from(output.data as Float32Array)
    }),
  )
  return results
}
```

- [ ] **Step 3: Run tests**

Run: `cd packages/embedding-onnx && pnpm test`
Expected: All PASS

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: All PASS

- [ ] **Step 5: Commit**

```
git commit -m "perf(embedding-onnx): parallelize embedBatch with Promise.all

Replace sequential for-loop with Promise.all for concurrent embedding.

Closes #10"
```
