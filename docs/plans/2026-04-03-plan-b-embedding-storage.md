# Plan B: Embedding ONNX + Storage PostgreSQL

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the infrastructure layer packages for embedding generation and persistent storage.

**Architecture:** Two independent packages implementing core interfaces. embedding-onnx uses @huggingface/transformers for ONNX model inference. storage-postgres uses drizzle-orm with PostgreSQL + pgvector (HNSW) + pg_bigm for hybrid search storage.

**Tech Stack:** @huggingface/transformers, drizzle-orm, drizzle-kit, drizzle-zod, pg, pgvector, pg_bigm, Vitest, Docker

**Prerequisites:** Plan A complete (core package with interfaces available)

**Blocks:** Plan C (mcp-server + hooks)

**Parallelism:** embedding-onnx and storage-postgres can be developed simultaneously in separate worktrees

---

## File Structure

```
packages/
├── embedding-onnx/
│   ├── src/
│   │   ├── onnx-embedding-provider.ts
│   │   └── index.ts
│   ├── tests/
│   │   └── onnx-embedding-provider.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── storage-postgres/
│   ├── src/
│   │   ├── schema.ts
│   │   ├── postgres-storage-repository.ts
│   │   └── index.ts
│   ├── drizzle/
│   ├── tests/
│   │   └── postgres-storage-repository.test.ts
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
Dockerfile.db
docker-compose.test.yml
```

---

# Part 1: embedding-onnx (Worktree A)

## Task 1: Scaffold embedding-onnx Package

**Files:**
- Create: `packages/embedding-onnx/package.json`, `tsconfig.json`, `vitest.config.ts`

- [ ] **Step 1: Create directory**

```bash
mkdir -p packages/embedding-onnx/src packages/embedding-onnx/tests
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@claude-memory/embedding-onnx",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
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
    "@claude-memory/core": "workspace:*",
    "@huggingface/transformers": "3.4.1"
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
    testTimeout: 60000, // モデルダウンロード時間を考慮
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

- [ ] **Step 5: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 6: Commit**

```bash
git add packages/embedding-onnx/
git commit -m "chore(embedding-onnx): scaffold package with dependencies"
```

---

## Task 2: OnnxEmbeddingProvider (TDD)

**Files:**
- Create: `packages/embedding-onnx/src/onnx-embedding-provider.ts`, `index.ts`
- Test: `packages/embedding-onnx/tests/onnx-embedding-provider.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/embedding-onnx/tests/onnx-embedding-provider.test.ts
import { describe, expect, it, beforeAll } from 'vitest'
import { OnnxEmbeddingProvider } from '../src/onnx-embedding-provider.js'

describe('OnnxEmbeddingProvider', () => {
  let provider: OnnxEmbeddingProvider

  beforeAll(async () => {
    provider = new OnnxEmbeddingProvider({
      modelName: 'intfloat/multilingual-e5-small',
    })
    // 初回はモデルダウンロードが走るため時間がかかる
  })

  describe('getDimension', () => {
    it('should return 384 for multilingual-e5-small', () => {
      expect(provider.getDimension()).toBe(384)
    })
  })

  describe('embed', () => {
    it('should return a vector of correct dimension', async () => {
      const vector = await provider.embed('テスト文章')
      expect(vector).toHaveLength(384)
      expect(vector.every((v) => typeof v === 'number')).toBe(true)
    })

    it('should return different vectors for different texts', async () => {
      const vec1 = await provider.embed('TypeScriptの型推論')
      const vec2 = await provider.embed('今日の天気は晴れ')
      expect(vec1).not.toEqual(vec2)
    })

    it('should return similar vectors for similar texts', async () => {
      const vec1 = await provider.embed('TypeScriptの型推論について')
      const vec2 = await provider.embed('TypeScriptの型システム')
      const similarity = cosineSimilarity(vec1, vec2)
      expect(similarity).toBeGreaterThan(0.5)
    })
  })

  describe('embedBatch', () => {
    it('should embed multiple texts at once', async () => {
      const vectors = await provider.embedBatch([
        'テスト1',
        'テスト2',
        'テスト3',
      ])
      expect(vectors).toHaveLength(3)
      expect(vectors.every((v) => v.length === 384)).toBe(true)
    })
  })
})

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/embedding-onnx && pnpm test
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement OnnxEmbeddingProvider**

```typescript
// packages/embedding-onnx/src/onnx-embedding-provider.ts
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'
import type { EmbeddingProvider } from '@claude-memory/core'

interface OnnxEmbeddingConfig {
  modelName: string
}

// モデル名 → 次元数のマッピング
const MODEL_DIMENSIONS: Record<string, number> = {
  'intfloat/multilingual-e5-small': 384,
  'intfloat/multilingual-e5-base': 768,
  'intfloat/multilingual-e5-large': 1024,
}

const DEFAULT_DIMENSION = 384

export class OnnxEmbeddingProvider implements EmbeddingProvider {
  private readonly config: OnnxEmbeddingConfig
  private extractor: FeatureExtractionPipeline | null = null

  constructor(config: OnnxEmbeddingConfig) {
    this.config = config
  }

  getDimension(): number {
    return MODEL_DIMENSIONS[this.config.modelName] ?? DEFAULT_DIMENSION
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.getExtractor()
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const extractor = await this.getExtractor()
    const results: number[][] = []

    for (const text of texts) {
      const output = await extractor(text, { pooling: 'mean', normalize: true })
      results.push(Array.from(output.data as Float32Array))
    }

    return results
  }

  private async getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', this.config.modelName)
    }
    return this.extractor
  }
}
```

```typescript
// packages/embedding-onnx/src/index.ts
export { OnnxEmbeddingProvider } from './onnx-embedding-provider.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/embedding-onnx && pnpm test
```
Expected: PASS (初回はモデルDLで数分かかる)

- [ ] **Step 5: Run coverage**

```bash
cd packages/embedding-onnx && pnpm test:coverage
```
Expected: >= 75%

- [ ] **Step 6: Commit**

```bash
git add packages/embedding-onnx/
git commit -m "feat(embedding-onnx): implement OnnxEmbeddingProvider with @huggingface/transformers"
```

---

# Part 2: storage-postgres (Worktree B)

## Task 3: Docker DB Image

**Files:**
- Create: `Dockerfile.db`, `docker-compose.test.yml`

- [ ] **Step 1: Create Dockerfile.db**

```dockerfile
# Dockerfile.db
# pgvector + pg_bigm on PostgreSQL 16
FROM pgvector/pgvector:pg16

# Install pg_bigm for Japanese bigram full-text search
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       postgresql-16-pg-bigm \
    && rm -rf /var/lib/apt/lists/*
```

- [ ] **Step 2: Create docker-compose.test.yml**

```yaml
# docker-compose.test.yml
services:
  db-test:
    build:
      context: .
      dockerfile: Dockerfile.db
    environment:
      POSTGRES_DB: claude_memory_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d claude_memory_test"]
      interval: 5s
      timeout: 5s
      retries: 5
```

- [ ] **Step 3: Build and verify DB image**

```bash
docker compose -f docker-compose.test.yml up -d
docker compose -f docker-compose.test.yml exec db-test psql -U test -d claude_memory_test -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_bigm; SELECT extname FROM pg_extension;"
```
Expected: vector と pg_bigm が表示される

- [ ] **Step 4: Commit**

```bash
git add Dockerfile.db docker-compose.test.yml
git commit -m "chore: add custom PostgreSQL Docker image with pgvector and pg_bigm"
```

---

## Task 4: Scaffold storage-postgres Package

**Files:**
- Create: `packages/storage-postgres/package.json`, `tsconfig.json`, `vitest.config.ts`, `drizzle.config.ts`

- [ ] **Step 1: Create directory**

```bash
mkdir -p packages/storage-postgres/src packages/storage-postgres/tests packages/storage-postgres/drizzle
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@claude-memory/storage-postgres",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
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
    "test:coverage": "vitest run --coverage",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@claude-memory/core": "workspace:*",
    "drizzle-orm": "0.39.3",
    "drizzle-zod": "0.7.1",
    "postgres": "3.4.5",
    "pgvector": "0.2.0"
  },
  "devDependencies": {
    "typescript": "5.7.3",
    "vitest": "3.1.1",
    "@vitest/coverage-v8": "3.1.1",
    "drizzle-kit": "0.30.5"
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
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/schema.ts'],
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

- [ ] **Step 5: Create drizzle.config.ts**

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5433/claude_memory_test',
  },
})
```

- [ ] **Step 6: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 7: Commit**

```bash
git add packages/storage-postgres/
git commit -m "chore(storage-postgres): scaffold package with drizzle-orm"
```

---

## Task 5: Drizzle Schema + Migration

**Files:**
- Create: `packages/storage-postgres/src/schema.ts`

- [ ] **Step 1: Create drizzle schema**

```typescript
// packages/storage-postgres/src/schema.ts
import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { vector } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { sql } from 'drizzle-orm'

// 次元数は環境変数で設定可能（デフォルト: 384）
const embeddingDimension = Number(process.env.EMBEDDING_DIMENSION ?? '384')

export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: embeddingDimension }),
    sessionId: text('session_id'),
    projectPath: text('project_path'),
    tags: text('tags').array(),
    source: text('source').$type<'manual' | 'auto'>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    // updatedAt はアプリケーション層で明示的にセット
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // pg_bigm bigram 全文検索インデックス
    index('idx_memories_bigm').using('gin', sql`${table.content} gin_bigm_ops`),
    // HNSW ベクトル検索インデックス
    index('idx_memories_vector').using('hnsw', sql`${table.embedding} vector_cosine_ops`),
  ],
)

export const insertMemorySchema = createInsertSchema(memories, {
  content: (schema) => schema.min(1, '空文字不可'),
})

export const selectMemorySchema = createSelectSchema(memories)
```

- [ ] **Step 2: Generate migration**

```bash
cd packages/storage-postgres && pnpm db:generate
```
Expected: drizzle/ に migration SQL ファイルが生成される

- [ ] **Step 3: Apply migration to test DB**

```bash
cd packages/storage-postgres && DATABASE_URL=postgresql://test:test@localhost:5433/claude_memory_test pnpm db:push
```
Expected: テーブルとインデックスが作成される

- [ ] **Step 4: Verify with psql**

```bash
docker compose -f docker-compose.test.yml exec db-test psql -U test -d claude_memory_test -c "\dt" -c "\di"
```
Expected: memories テーブルと idx_memories_bigm, idx_memories_vector が表示される

- [ ] **Step 5: Commit**

```bash
git add packages/storage-postgres/src/schema.ts packages/storage-postgres/drizzle/
git commit -m "feat(storage-postgres): add drizzle schema with pgvector and pg_bigm indexes"
```

---

## Task 6: PostgresStorageRepository (TDD)

**Files:**
- Create: `packages/storage-postgres/src/postgres-storage-repository.ts`, `index.ts`
- Test: `packages/storage-postgres/tests/postgres-storage-repository.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/storage-postgres/tests/postgres-storage-repository.test.ts
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { PostgresStorageRepository } from '../src/postgres-storage-repository.js'
import type { Memory } from '@claude-memory/core'
import { memories } from '../src/schema.js'

const TEST_DB_URL = 'postgresql://test:test@localhost:5433/claude_memory_test'

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: crypto.randomUUID(),
    content: 'test content for searching',
    embedding: Array.from({ length: 384 }, () => Math.random()),
    metadata: {
      sessionId: 'session-1',
      source: 'manual',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('PostgresStorageRepository', () => {
  let repo: PostgresStorageRepository
  let client: ReturnType<typeof postgres>
  let db: ReturnType<typeof drizzle>

  beforeAll(() => {
    client = postgres(TEST_DB_URL)
    db = drizzle(client)
    repo = new PostgresStorageRepository(TEST_DB_URL)
  })

  afterAll(async () => {
    await client.end()
  })

  beforeEach(async () => {
    await db.delete(memories)
  })

  describe('save and findById', () => {
    it('should save and retrieve a memory', async () => {
      const memory = makeMemory()
      await repo.save(memory)
      const found = await repo.findById(memory.id)
      expect(found).not.toBeNull()
      expect(found!.content).toBe(memory.content)
      expect(found!.metadata.sessionId).toBe('session-1')
    })

    it('should return null for non-existent id', async () => {
      const found = await repo.findById(crypto.randomUUID())
      expect(found).toBeNull()
    })
  })

  describe('saveBatch', () => {
    it('should save multiple memories', async () => {
      const mems = [makeMemory(), makeMemory()]
      await repo.saveBatch(mems)
      const stats = await repo.getStats()
      expect(stats.totalMemories).toBe(2)
    })
  })

  describe('delete', () => {
    it('should delete a memory', async () => {
      const memory = makeMemory()
      await repo.save(memory)
      await repo.delete(memory.id)
      const found = await repo.findById(memory.id)
      expect(found).toBeNull()
    })
  })

  describe('clear', () => {
    it('should delete all memories', async () => {
      await repo.saveBatch([makeMemory(), makeMemory()])
      await repo.clear()
      const stats = await repo.getStats()
      expect(stats.totalMemories).toBe(0)
    })
  })

  describe('list', () => {
    it('should list memories with pagination', async () => {
      await repo.saveBatch([makeMemory(), makeMemory(), makeMemory()])
      const result = await repo.list({ limit: 2, offset: 0 })
      expect(result).toHaveLength(2)
    })

    it('should filter by source', async () => {
      await repo.save(makeMemory({ metadata: { sessionId: 's1', source: 'manual' } }))
      await repo.save(makeMemory({ metadata: { sessionId: 's2', source: 'auto' } }))
      const result = await repo.list({ limit: 10, offset: 0, source: 'manual' })
      expect(result).toHaveLength(1)
      expect(result[0]!.metadata.source).toBe('manual')
    })
  })

  describe('searchByKeyword', () => {
    it('should find memories by keyword (bigram)', async () => {
      await repo.save(makeMemory({ content: 'TypeScriptの型推論について' }))
      await repo.save(makeMemory({ content: '今日の天気は晴れです' }))
      const results = await repo.searchByKeyword('TypeScript', 10)
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0]!.memory.content).toContain('TypeScript')
    })

    it('should filter by projectPath', async () => {
      await repo.save(makeMemory({
        content: 'shared keyword content',
        metadata: { sessionId: 's1', source: 'manual', projectPath: '/project-a' },
      }))
      await repo.save(makeMemory({
        content: 'shared keyword content',
        metadata: { sessionId: 's2', source: 'manual', projectPath: '/project-b' },
      }))
      const results = await repo.searchByKeyword('keyword', 10, { projectPath: '/project-a' })
      expect(results).toHaveLength(1)
    })
  })

  describe('searchByVector', () => {
    it('should find similar memories by vector', async () => {
      const embedding = Array.from({ length: 384 }, () => Math.random())
      await repo.save(makeMemory({ embedding }))
      await repo.save(makeMemory()) // random embedding
      const results = await repo.searchByVector(embedding, 10)
      expect(results.length).toBeGreaterThanOrEqual(1)
      // 同じベクトルが最も類似度が高いはず
      expect(results[0]!.score).toBeGreaterThan(0)
    })
  })

  describe('getStats', () => {
    it('should return correct stats', async () => {
      await repo.save(makeMemory({ metadata: { sessionId: 's1', source: 'manual' } }))
      await repo.save(makeMemory({ metadata: { sessionId: 's2', source: 'auto' } }))
      const stats = await repo.getStats()
      expect(stats.totalMemories).toBe(2)
      expect(stats.totalSessions).toBe(2)
      expect(stats.averageContentLength).toBeGreaterThan(0)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f docker-compose.test.yml up -d
cd packages/storage-postgres && pnpm test
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement PostgresStorageRepository**

```typescript
// packages/storage-postgres/src/postgres-storage-repository.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, sql, desc, asc, and, count, avg } from 'drizzle-orm'
import postgres from 'postgres'
import type {
  StorageRepository,
  Memory,
  ListOptions,
  StorageStats,
  SearchResult,
  SearchFilter,
} from '@claude-memory/core'
import { memories } from './schema.js'

export class PostgresStorageRepository implements StorageRepository {
  private readonly db: ReturnType<typeof drizzle>
  private readonly client: ReturnType<typeof postgres>

  constructor(connectionString: string) {
    this.client = postgres(connectionString)
    this.db = drizzle(this.client)
  }

  async save(memory: Memory): Promise<void> {
    await this.db.insert(memories).values({
      id: memory.id,
      content: memory.content,
      embedding: memory.embedding,
      sessionId: memory.metadata.sessionId,
      projectPath: memory.metadata.projectPath,
      tags: memory.metadata.tags,
      source: memory.metadata.source,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    })
  }

  async saveBatch(mems: Memory[]): Promise<void> {
    if (mems.length === 0) return
    await this.db.insert(memories).values(
      mems.map((m) => ({
        id: m.id,
        content: m.content,
        embedding: m.embedding,
        sessionId: m.metadata.sessionId,
        projectPath: m.metadata.projectPath,
        tags: m.metadata.tags,
        source: m.metadata.source,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    )
  }

  async findById(id: string): Promise<Memory | null> {
    const rows = await this.db.select().from(memories).where(eq(memories.id, id)).limit(1)
    if (rows.length === 0) return null
    return this.toMemory(rows[0]!)
  }

  async searchByKeyword(
    query: string,
    limit: number,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    const conditions = [sql`${memories.content} LIKE '%' || ${query} || '%'`]
    if (filter?.projectPath) conditions.push(eq(memories.projectPath, filter.projectPath))
    if (filter?.source) conditions.push(eq(memories.source, filter.source))

    const rows = await this.db
      .select()
      .from(memories)
      .where(and(...conditions))
      .limit(limit)

    return rows.map((row, i) => ({
      memory: this.toMemory(row),
      score: 1 / (i + 1),
      matchType: 'keyword' as const,
    }))
  }

  async searchByVector(
    embedding: number[],
    limit: number,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    const vectorStr = `[${embedding.join(',')}]`
    const conditions: ReturnType<typeof eq>[] = []
    if (filter?.projectPath) conditions.push(eq(memories.projectPath, filter.projectPath))
    if (filter?.source) conditions.push(eq(memories.source, filter.source))

    const distanceExpr = sql<number>`${memories.embedding} <=> ${vectorStr}::vector`

    let query = this.db
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
        distance: distanceExpr,
      })
      .from(memories)

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query
    }

    const rows = await query.orderBy(distanceExpr).limit(limit)

    return rows.map((row) => ({
      memory: this.toMemory(row),
      score: 1 - (row.distance ?? 1), // cosine distance → similarity
      matchType: 'vector' as const,
    }))
  }

  async list(options: ListOptions): Promise<Memory[]> {
    const conditions: ReturnType<typeof eq>[] = []
    if (options.source) conditions.push(eq(memories.source, options.source))
    if (options.sessionId) conditions.push(eq(memories.sessionId, options.sessionId))

    const orderCol = options.sortBy === 'updatedAt' ? memories.updatedAt : memories.createdAt
    const orderFn = options.sortOrder === 'asc' ? asc : desc

    let query = this.db.select().from(memories)
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query
    }

    const rows = await query.orderBy(orderFn(orderCol)).limit(options.limit).offset(options.offset)
    return rows.map(this.toMemory)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(memories).where(eq(memories.id, id))
  }

  async clear(): Promise<void> {
    await this.db.delete(memories)
  }

  async getStats(): Promise<StorageStats> {
    const [statsRow] = await this.db
      .select({
        totalMemories: count(),
        avgLength: avg(sql<number>`length(${memories.content})`),
      })
      .from(memories)

    const [sessionsRow] = await this.db
      .select({ total: sql<number>`count(distinct ${memories.sessionId})` })
      .from(memories)

    const [oldest] = await this.db
      .select({ createdAt: memories.createdAt })
      .from(memories)
      .orderBy(asc(memories.createdAt))
      .limit(1)

    const [newest] = await this.db
      .select({ createdAt: memories.createdAt })
      .from(memories)
      .orderBy(desc(memories.createdAt))
      .limit(1)

    return {
      totalMemories: Number(statsRow?.totalMemories ?? 0),
      totalSessions: Number(sessionsRow?.total ?? 0),
      oldestMemory: oldest?.createdAt ?? null,
      newestMemory: newest?.createdAt ?? null,
      averageContentLength: Number(statsRow?.avgLength ?? 0),
    }
  }

  private toMemory(row: typeof memories.$inferSelect): Memory {
    return {
      id: row.id,
      content: row.content,
      embedding: row.embedding as number[] ?? [],
      metadata: {
        sessionId: row.sessionId ?? '',
        projectPath: row.projectPath ?? undefined,
        tags: row.tags ?? undefined,
        source: (row.source as 'manual' | 'auto') ?? 'manual',
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
```

```typescript
// packages/storage-postgres/src/index.ts
export { PostgresStorageRepository } from './postgres-storage-repository.js'
export { memories, insertMemorySchema, selectMemorySchema } from './schema.js'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/storage-postgres && pnpm test
```
Expected: PASS

- [ ] **Step 5: Run coverage**

```bash
cd packages/storage-postgres && pnpm test:coverage
```
Expected: >= 75%

- [ ] **Step 6: Stop test DB**

```bash
docker compose -f docker-compose.test.yml down
```

- [ ] **Step 7: Commit**

```bash
git add packages/storage-postgres/ Dockerfile.db docker-compose.test.yml
git commit -m "feat(storage-postgres): implement PostgresStorageRepository with pgvector and pg_bigm"
```
