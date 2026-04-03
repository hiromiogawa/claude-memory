# Plan A: Repository Foundation + Core Package

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Initialize the monorepo with code quality tooling and implement the core domain package with entities, interfaces, and use cases.

**Architecture:** pnpm monorepo with strict TypeScript. Core package is dependency-free, defining domain entities, repository/provider interfaces, and use cases that orchestrate business logic.

**Tech Stack:** pnpm, TypeScript 5.7, Biome, OXLint, knip, dependency-cruiser, lefthook, commitlint, Vitest

**Prerequisites:** None (this is the first plan)

**Blocks:** Plan B (embedding-onnx + storage-postgres), Plan C (mcp-server + hooks)

---

## File Structure

```
claude-memory/
├── packages/core/
│   ├── src/
│   │   ├── entities/
│   │   │   ├── memory.ts
│   │   │   ├── search-result.ts
│   │   │   ├── chunk.ts
│   │   │   ├── conversation.ts
│   │   │   └── index.ts
│   │   ├── interfaces/
│   │   │   ├── embedding-provider.ts
│   │   │   ├── storage-repository.ts
│   │   │   ├── chunking-strategy.ts
│   │   │   └── index.ts
│   │   ├── use-cases/
│   │   │   ├── save-memory.ts
│   │   │   ├── search-memory.ts
│   │   │   ├── delete-memory.ts
│   │   │   ├── list-memories.ts
│   │   │   ├── get-stats.ts
│   │   │   ├── clear-memory.ts
│   │   │   └── index.ts
│   │   ├── errors/
│   │   │   ├── memory-error.ts
│   │   │   └── index.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── tests/
│   │   ├── entities/
│   │   │   └── memory.test.ts
│   │   └── use-cases/
│   │       ├── save-memory.test.ts
│   │       ├── search-memory.test.ts
│   │       ├── delete-memory.test.ts
│   │       ├── list-memories.test.ts
│   │       ├── get-stats.test.ts
│   │       └── clear-memory.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── pnpm-workspace.yaml
├── .npmrc
├── tsconfig.base.json
├── biome.json
├── .oxlintrc.json
├── knip.json
├── .dependency-cruiser.cjs
├── lefthook.yml
├── commitlint.config.cjs
├── .gitignore
├── package.json
└── CLAUDE.md
```

---

## Task 1: Git + Monorepo Initialization

**Files:**
- Create: `package.json`, `.gitignore`, `.npmrc`, `pnpm-workspace.yaml`, `tsconfig.base.json`

- [ ] **Step 1: Initialize git repository**

```bash
cd /Users/ogawahiromi/work/develop/claude-memory
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
node_modules/
dist/
*.tsbuildinfo
.env
.DS_Store
coverage/
```

- [ ] **Step 3: Create root package.json**

```json
{
  "name": "claude-memory",
  "private": true,
  "packageManager": "pnpm@10.8.1",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=10.0.0"
  },
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "test:unit": "pnpm --filter @claude-memory/core run test",
    "lint": "oxlint . && biome check .",
    "format": "biome check --write .",
    "knip": "knip",
    "dep-check": "depcruise --validate packages/"
  }
}
```

- [ ] **Step 4: Create .npmrc**

```ini
save-exact=true
resolution-mode=lowest
use-node-version=22.14.0
engine-strict=true
hoist=false
strict-peer-dependencies=true
frozen-lockfile=true
prefer-frozen-lockfile=true
side-effects-cache=true
prefer-offline=true
```

- [ ] **Step 5: Create pnpm-workspace.yaml**

```yaml
packages:
  - packages/*
```

- [ ] **Step 6: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 7: Install pnpm and initialize**

```bash
corepack enable
corepack prepare pnpm@10.8.1 --activate
pnpm install
```

- [ ] **Step 8: Commit**

```bash
git add package.json .gitignore .npmrc pnpm-workspace.yaml tsconfig.base.json
git commit -m "chore: initialize monorepo with pnpm workspaces"
```

---

## Task 2: Code Quality Tooling

**Files:**
- Create: `biome.json`, `.oxlintrc.json`, `knip.json`, `.dependency-cruiser.cjs`, `lefthook.yml`, `commitlint.config.cjs`

- [ ] **Step 1: Install dev dependencies**

```bash
pnpm add -Dw @biomejs/biome oxlint knip dependency-cruiser lefthook @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 2: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": false
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  }
}
```

- [ ] **Step 3: Create .oxlintrc.json**

```json
{
  "rules": {
    "all": "warn"
  },
  "ignorePatterns": ["dist/", "node_modules/", "coverage/"]
}
```

- [ ] **Step 4: Create knip.json**

```json
{
  "workspaces": {
    "packages/*": {
      "entry": ["src/index.ts"],
      "project": ["src/**/*.ts"]
    }
  },
  "ignore": ["**/*.test.ts"]
}
```

- [ ] **Step 5: Create .dependency-cruiser.cjs**

```javascript
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-must-not-import-infrastructure',
      comment: 'core は外部パッケージに依存してはならない',
      severity: 'error',
      from: { path: 'packages/core/src' },
      to: {
        path: [
          'packages/storage-postgres',
          'packages/embedding-onnx',
          'packages/mcp-server',
          'packages/hooks',
        ],
      },
    },
    {
      name: 'infrastructure-must-not-import-interface',
      comment: 'infrastructure は interface層に依存してはならない',
      severity: 'error',
      from: { path: ['packages/storage-postgres', 'packages/embedding-onnx'] },
      to: { path: ['packages/mcp-server', 'packages/hooks'] },
    },
    {
      name: 'no-circular-deps',
      comment: '循環依存禁止',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
}
```

- [ ] **Step 6: Create lefthook.yml**

```yaml
pre-commit:
  parallel: true
  commands:
    biome:
      glob: "*.{ts,tsx,js,json}"
      run: pnpm biome check --write {staged_files}
      stage_fixed: true
    oxlint:
      glob: "*.{ts,tsx,js}"
      run: pnpm oxlint {staged_files}
    knip:
      run: pnpm knip
    dep-check:
      run: pnpm dep-check

pre-push:
  commands:
    knip-full:
      run: pnpm knip

commit-msg:
  commands:
    commitlint:
      run: pnpm commitlint --edit {1}
```

- [ ] **Step 7: Create commitlint.config.cjs**

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['core', 'embedding-onnx', 'storage-postgres', 'mcp-server', 'hooks', 'deps', 'ci', 'adr'],
    ],
  },
}
```

- [ ] **Step 8: Initialize lefthook**

```bash
pnpm lefthook install
```

- [ ] **Step 9: Commit**

```bash
git add biome.json .oxlintrc.json knip.json .dependency-cruiser.cjs lefthook.yml commitlint.config.cjs
git commit -m "chore: add code quality tooling (Biome, OXLint, knip, dependency-cruiser, lefthook, commitlint)"
```

---

## Task 3: Core Package Scaffolding

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`

- [ ] **Step 1: Create packages/core directory**

```bash
mkdir -p packages/core/src packages/core/tests
```

- [ ] **Step 2: Create packages/core/package.json**

```json
{
  "name": "@claude-memory/core",
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
  "devDependencies": {
    "typescript": "5.7.3",
    "vitest": "3.1.1",
    "@vitest/coverage-v8": "3.1.1"
  }
}
```

- [ ] **Step 3: Create packages/core/tsconfig.json**

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

- [ ] **Step 4: Create packages/core/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/index.ts'],
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
git add packages/core/
git commit -m "chore(core): scaffold core package with TypeScript and Vitest"
```

---

## Task 4: Core Entities

**Files:**
- Create: `packages/core/src/entities/memory.ts`, `packages/core/src/entities/search-result.ts`, `packages/core/src/entities/chunk.ts`, `packages/core/src/entities/conversation.ts`, `packages/core/src/entities/index.ts`, `packages/core/src/constants.ts`
- Test: `packages/core/tests/entities/memory.test.ts`

- [ ] **Step 1: Write entity validation test**

```typescript
// packages/core/tests/entities/memory.test.ts
import { describe, expect, it } from 'vitest'
import type { Memory, MemoryMetadata } from '../../src/entities/memory.js'
import { SEARCH_DEFAULTS } from '../../src/constants.js'

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test
```
Expected: FAIL (modules not found)

- [ ] **Step 3: Create entities and constants**

```typescript
// packages/core/src/entities/memory.ts
/**
 * 記憶の最小単位。1つのQ&Aペアに対応する。
 *
 * @remarks
 * - `content` は空文字を許容しない
 * - `embedding` の次元数は EmbeddingProvider に依存
 */
export interface Memory {
  /** UUID v4 */
  id: string
  /** Q&Aペアのテキスト。空文字不可 */
  content: string
  /** ベクトル表現。次元数はEmbeddingProviderに依存 */
  embedding: number[]
  metadata: MemoryMetadata
  createdAt: Date
  updatedAt: Date
}

export interface MemoryMetadata {
  /** どのセッションで生まれたか */
  sessionId: string
  /** プロジェクトのパス */
  projectPath?: string
  /** キーワードタグ */
  tags?: string[]
  /** 手動保存 or Hooks自動保存 */
  source: 'manual' | 'auto'
}

export interface ListOptions {
  /** 取得件数。デフォルト: 20、最大: 100 */
  limit: number
  /** オフセット。デフォルト: 0 */
  offset: number
  source?: 'manual' | 'auto'
  sessionId?: string
  sortBy?: 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface StorageStats {
  totalMemories: number
  totalSessions: number
  oldestMemory: Date | null
  newestMemory: Date | null
  averageContentLength: number
}
```

```typescript
// packages/core/src/entities/search-result.ts
import type { Memory } from './memory.js'

export interface SearchResult {
  memory: Memory
  /** RRF統合スコア（0〜1）。k=60, 時間減衰半減期30日 */
  score: number
  matchType: 'keyword' | 'vector' | 'hybrid'
}

export interface SearchFilter {
  /** プロジェクトパスでスコープ */
  projectPath?: string
  /** ソースで絞り込み */
  source?: 'manual' | 'auto'
}
```

```typescript
// packages/core/src/entities/chunk.ts
import type { MemoryMetadata } from './memory.js'

export interface Chunk {
  content: string
  /** tags はチャンク生成後に自動抽出で付与される（TF-IDFベースのキーワード抽出） */
  metadata: MemoryMetadata
}
```

```typescript
// packages/core/src/entities/conversation.ts
export interface ConversationLog {
  sessionId: string
  projectPath?: string
  messages: ConversationMessage[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
```

```typescript
// packages/core/src/entities/index.ts
export type { Memory, MemoryMetadata, ListOptions, StorageStats } from './memory.js'
export type { SearchResult, SearchFilter } from './search-result.js'
export type { Chunk } from './chunk.js'
export type { ConversationLog, ConversationMessage } from './conversation.js'
```

```typescript
// packages/core/src/constants.ts
/** 検索パラメータのデフォルト値 */
export const SEARCH_DEFAULTS = {
  /** RRF の k パラメータ */
  rrfK: 60,
  /** 時間減衰の半減期（日数） */
  decayHalfLifeDays: 30,
  /** 検索結果の上限 */
  maxResults: 20,
} as const
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/entities/ packages/core/src/constants.ts packages/core/tests/
git commit -m "feat(core): add domain entities and search defaults"
```

---

## Task 5: Core Interfaces

**Files:**
- Create: `packages/core/src/interfaces/embedding-provider.ts`, `packages/core/src/interfaces/storage-repository.ts`, `packages/core/src/interfaces/chunking-strategy.ts`, `packages/core/src/interfaces/index.ts`

- [ ] **Step 1: Create interfaces**

```typescript
// packages/core/src/interfaces/embedding-provider.ts
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  getDimension(): number
}
```

```typescript
// packages/core/src/interfaces/storage-repository.ts
import type { Memory, ListOptions, StorageStats } from '../entities/memory.js'
import type { SearchResult, SearchFilter } from '../entities/search-result.js'

export interface StorageRepository {
  save(memory: Memory): Promise<void>
  saveBatch(memories: Memory[]): Promise<void>
  findById(id: string): Promise<Memory | null>
  /** キーワード検索。pg_bigm bigram部分一致。複数語はAND結合 */
  searchByKeyword(query: string, limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  /** ベクトル検索。コサイン類似度 */
  searchByVector(embedding: number[], limit: number, filter?: SearchFilter): Promise<SearchResult[]>
  list(options: ListOptions): Promise<Memory[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
  getStats(): Promise<StorageStats>
}
```

```typescript
// packages/core/src/interfaces/chunking-strategy.ts
import type { ConversationLog } from '../entities/conversation.js'
import type { Chunk } from '../entities/chunk.js'

export interface ChunkingStrategy {
  chunk(conversation: ConversationLog): Chunk[]
}
```

```typescript
// packages/core/src/interfaces/index.ts
export type { EmbeddingProvider } from './embedding-provider.js'
export type { StorageRepository } from './storage-repository.js'
export type { ChunkingStrategy } from './chunking-strategy.js'
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/interfaces/
git commit -m "feat(core): add port interfaces (EmbeddingProvider, StorageRepository, ChunkingStrategy)"
```

---

## Task 6: Core Errors

**Files:**
- Create: `packages/core/src/errors/memory-error.ts`, `packages/core/src/errors/index.ts`

- [ ] **Step 1: Create error classes**

```typescript
// packages/core/src/errors/memory-error.ts
export class MemoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'MemoryError'
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super(`Memory not found: ${id}`, 'MEMORY_NOT_FOUND')
    this.name = 'MemoryNotFoundError'
  }
}

export class EmbeddingFailedError extends MemoryError {
  constructor(reason: string) {
    super(`Embedding failed: ${reason}`, 'EMBEDDING_FAILED')
    this.name = 'EmbeddingFailedError'
  }
}

export class StorageConnectionError extends MemoryError {
  constructor(reason: string) {
    super(`Storage connection error: ${reason}`, 'STORAGE_CONNECTION_ERROR')
    this.name = 'StorageConnectionError'
  }
}
```

```typescript
// packages/core/src/errors/index.ts
export {
  MemoryError,
  MemoryNotFoundError,
  EmbeddingFailedError,
  StorageConnectionError,
} from './memory-error.js'
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/errors/
git commit -m "feat(core): add custom error hierarchy"
```

---

## Task 7: SaveMemoryUseCase (TDD)

**Files:**
- Create: `packages/core/src/use-cases/save-memory.ts`
- Test: `packages/core/tests/use-cases/save-memory.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/core/tests/use-cases/save-memory.test.ts
import { describe, expect, it, vi } from 'vitest'
import { SaveMemoryUseCase } from '../../src/use-cases/save-memory.js'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import type { EmbeddingProvider } from '../../src/interfaces/embedding-provider.js'
import type { ChunkingStrategy } from '../../src/interfaces/chunking-strategy.js'
import type { ConversationLog } from '../../src/entities/conversation.js'

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
    embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]),
    getDimension: vi.fn().mockReturnValue(384),
  }
}

function createMockChunking(): ChunkingStrategy {
  return {
    chunk: vi.fn().mockReturnValue([
      {
        content: 'Q: hello\nA: world',
        metadata: { sessionId: 's1', source: 'auto' as const },
      },
    ]),
  }
}

describe('SaveMemoryUseCase', () => {
  it('should save a manual memory with embedding', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()
    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)

    await useCase.saveManual({
      content: 'test content',
      sessionId: 'session-1',
      projectPath: '/project',
    })

    expect(embedding.embed).toHaveBeenCalledWith('test content')
    expect(storage.save).toHaveBeenCalledTimes(1)
    const savedMemory = vi.mocked(storage.save).mock.calls[0]![0]
    expect(savedMemory.content).toBe('test content')
    expect(savedMemory.embedding).toEqual([0.1, 0.2, 0.3])
    expect(savedMemory.metadata.source).toBe('manual')
  })

  it('should save conversation as auto memories via chunking', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()
    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)

    const log: ConversationLog = {
      sessionId: 'session-1',
      messages: [
        { role: 'user', content: 'hello', timestamp: new Date() },
        { role: 'assistant', content: 'world', timestamp: new Date() },
      ],
    }

    await useCase.saveConversation(log)

    expect(chunking.chunk).toHaveBeenCalledWith(log)
    expect(embedding.embedBatch).toHaveBeenCalled()
    expect(storage.saveBatch).toHaveBeenCalledTimes(1)
  })

  it('should skip failed embeddings and save successful ones', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()
    const chunking = createMockChunking()
    vi.mocked(chunking.chunk).mockReturnValue([
      { content: 'chunk1', metadata: { sessionId: 's1', source: 'auto' as const } },
      { content: 'chunk2', metadata: { sessionId: 's1', source: 'auto' as const } },
    ])
    vi.mocked(embedding.embedBatch).mockResolvedValue([
      [0.1, 0.2],
      [], // failed embedding represented as empty
    ])

    const useCase = new SaveMemoryUseCase(storage, embedding, chunking)
    const log: ConversationLog = {
      sessionId: 's1',
      messages: [
        { role: 'user', content: 'q1', timestamp: new Date() },
        { role: 'assistant', content: 'a1', timestamp: new Date() },
        { role: 'user', content: 'q2', timestamp: new Date() },
        { role: 'assistant', content: 'a2', timestamp: new Date() },
      ],
    }

    await useCase.saveConversation(log)
    const savedMemories = vi.mocked(storage.saveBatch).mock.calls[0]![0]
    expect(savedMemories.length).toBe(1) // only the successful one
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test
```
Expected: FAIL

- [ ] **Step 3: Implement SaveMemoryUseCase**

```typescript
// packages/core/src/use-cases/save-memory.ts
import { randomUUID } from 'node:crypto'
import type { Memory } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import type { ChunkingStrategy } from '../interfaces/chunking-strategy.js'
import type { ConversationLog } from '../entities/conversation.js'

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
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/use-cases/save-memory.ts packages/core/tests/use-cases/save-memory.test.ts
git commit -m "feat(core): add SaveMemoryUseCase with manual and conversation save"
```

---

## Task 8: SearchMemoryUseCase (TDD)

**Files:**
- Create: `packages/core/src/use-cases/search-memory.ts`
- Test: `packages/core/tests/use-cases/search-memory.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/core/tests/use-cases/search-memory.test.ts
import { describe, expect, it, vi } from 'vitest'
import { SearchMemoryUseCase } from '../../src/use-cases/search-memory.js'
import type { StorageRepository } from '../../src/interfaces/storage-repository.js'
import type { EmbeddingProvider } from '../../src/interfaces/embedding-provider.js'
import type { SearchResult } from '../../src/entities/search-result.js'
import type { Memory } from '../../src/entities/memory.js'

function makeMemory(id: string, daysAgo: number = 0): Memory {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return {
    id,
    content: `content-${id}`,
    embedding: [0.1],
    metadata: { sessionId: 's1', source: 'manual' },
    createdAt: date,
    updatedAt: date,
  }
}

function createMockStorage(): StorageRepository {
  return {
    save: vi.fn(),
    saveBatch: vi.fn(),
    findById: vi.fn(),
    searchByKeyword: vi.fn().mockResolvedValue([]),
    searchByVector: vi.fn().mockResolvedValue([]),
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

describe('SearchMemoryUseCase', () => {
  it('should combine keyword and vector results via RRF', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()

    const mem1 = makeMemory('1')
    const mem2 = makeMemory('2')
    const mem3 = makeMemory('3')

    vi.mocked(storage.searchByKeyword).mockResolvedValue([
      { memory: mem1, score: 0.9, matchType: 'keyword' },
      { memory: mem2, score: 0.7, matchType: 'keyword' },
    ])
    vi.mocked(storage.searchByVector).mockResolvedValue([
      { memory: mem2, score: 0.95, matchType: 'vector' },
      { memory: mem3, score: 0.8, matchType: 'vector' },
    ])

    const useCase = new SearchMemoryUseCase(storage, embedding)
    const results = await useCase.search('test query', 10)

    expect(embedding.embed).toHaveBeenCalledWith('test query')
    expect(results.length).toBe(3)
    // mem2 appears in both lists, should have highest RRF score
    expect(results[0]!.memory.id).toBe('2')
    expect(results[0]!.matchType).toBe('hybrid')
  })

  it('should apply time decay to older memories', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()

    const recentMem = makeMemory('recent', 0)
    const oldMem = makeMemory('old', 60) // 60 days ago

    vi.mocked(storage.searchByKeyword).mockResolvedValue([
      { memory: recentMem, score: 0.8, matchType: 'keyword' },
      { memory: oldMem, score: 0.8, matchType: 'keyword' },
    ])
    vi.mocked(storage.searchByVector).mockResolvedValue([])

    const useCase = new SearchMemoryUseCase(storage, embedding)
    const results = await useCase.search('test', 10)

    // Recent memory should score higher than old memory due to time decay
    const recentResult = results.find((r) => r.memory.id === 'recent')!
    const oldResult = results.find((r) => r.memory.id === 'old')!
    expect(recentResult.score).toBeGreaterThan(oldResult.score)
  })

  it('should pass filter to storage methods', async () => {
    const storage = createMockStorage()
    const embedding = createMockEmbedding()

    const useCase = new SearchMemoryUseCase(storage, embedding)
    await useCase.search('test', 10, { projectPath: '/my/project' })

    expect(storage.searchByKeyword).toHaveBeenCalledWith('test', 10, { projectPath: '/my/project' })
    expect(storage.searchByVector).toHaveBeenCalledWith([0.1, 0.2, 0.3], 10, { projectPath: '/my/project' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test
```
Expected: FAIL

- [ ] **Step 3: Implement SearchMemoryUseCase**

```typescript
// packages/core/src/use-cases/search-memory.ts
import type { SearchResult, SearchFilter } from '../entities/search-result.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'
import type { EmbeddingProvider } from '../interfaces/embedding-provider.js'
import { SEARCH_DEFAULTS } from '../constants.js'

export class SearchMemoryUseCase {
  constructor(
    private readonly storage: StorageRepository,
    private readonly embedding: EmbeddingProvider,
  ) {}

  async search(
    query: string,
    limit: number = SEARCH_DEFAULTS.maxResults,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embedding.embed(query)

    const [keywordResults, vectorResults] = await Promise.all([
      this.storage.searchByKeyword(query, limit, filter),
      this.storage.searchByVector(queryEmbedding, limit, filter),
    ])

    return this.mergeWithRRF(keywordResults, vectorResults, limit)
  }

  private mergeWithRRF(
    keywordResults: SearchResult[],
    vectorResults: SearchResult[],
    limit: number,
  ): SearchResult[] {
    const k = SEARCH_DEFAULTS.rrfK
    const scoreMap = new Map<string, { score: number; result: SearchResult; sources: Set<string> }>()

    for (let i = 0; i < keywordResults.length; i++) {
      const r = keywordResults[i]!
      const rrfScore = 1 / (k + i + 1)
      scoreMap.set(r.memory.id, {
        score: rrfScore,
        result: r,
        sources: new Set(['keyword']),
      })
    }

    for (let i = 0; i < vectorResults.length; i++) {
      const r = vectorResults[i]!
      const rrfScore = 1 / (k + i + 1)
      const existing = scoreMap.get(r.memory.id)
      if (existing) {
        existing.score += rrfScore
        existing.sources.add('vector')
      } else {
        scoreMap.set(r.memory.id, {
          score: rrfScore,
          result: r,
          sources: new Set(['vector']),
        })
      }
    }

    const now = new Date()
    const results: SearchResult[] = []

    for (const entry of scoreMap.values()) {
      const decayedScore = entry.score * this.timeDecay(entry.result.memory.createdAt, now)
      const matchType: SearchResult['matchType'] =
        entry.sources.size > 1 ? 'hybrid' : entry.sources.has('keyword') ? 'keyword' : 'vector'

      results.push({
        memory: entry.result.memory,
        score: decayedScore,
        matchType,
      })
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  private timeDecay(createdAt: Date, now: Date): number {
    const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const halfLife = SEARCH_DEFAULTS.decayHalfLifeDays
    return Math.pow(0.5, daysDiff / halfLife)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/use-cases/search-memory.ts packages/core/tests/use-cases/search-memory.test.ts
git commit -m "feat(core): add SearchMemoryUseCase with RRF fusion and time decay"
```

---

## Task 9: Remaining Use Cases (TDD)

**Files:**
- Create: `packages/core/src/use-cases/delete-memory.ts`, `list-memories.ts`, `get-stats.ts`, `clear-memory.ts`, `index.ts`
- Test: `packages/core/tests/use-cases/delete-memory.test.ts`, `list-memories.test.ts`, `get-stats.test.ts`, `clear-memory.test.ts`

- [ ] **Step 1: Write failing tests for all remaining use cases**

```typescript
// packages/core/tests/use-cases/delete-memory.test.ts
import { describe, expect, it, vi } from 'vitest'
import { DeleteMemoryUseCase } from '../../src/use-cases/delete-memory.js'
import { MemoryNotFoundError } from '../../src/errors/memory-error.js'

describe('DeleteMemoryUseCase', () => {
  it('should delete an existing memory', async () => {
    const storage = { findById: vi.fn().mockResolvedValue({ id: '1' }), delete: vi.fn() } as any
    const useCase = new DeleteMemoryUseCase(storage)
    await useCase.execute('1')
    expect(storage.delete).toHaveBeenCalledWith('1')
  })

  it('should throw MemoryNotFoundError if memory does not exist', async () => {
    const storage = { findById: vi.fn().mockResolvedValue(null), delete: vi.fn() } as any
    const useCase = new DeleteMemoryUseCase(storage)
    await expect(useCase.execute('not-found')).rejects.toThrow(MemoryNotFoundError)
  })
})
```

```typescript
// packages/core/tests/use-cases/list-memories.test.ts
import { describe, expect, it, vi } from 'vitest'
import { ListMemoriesUseCase } from '../../src/use-cases/list-memories.js'

describe('ListMemoriesUseCase', () => {
  it('should pass options to storage and return results', async () => {
    const memories = [{ id: '1' }, { id: '2' }]
    const storage = { list: vi.fn().mockResolvedValue(memories) } as any
    const useCase = new ListMemoriesUseCase(storage)
    const result = await useCase.execute({ limit: 20, offset: 0 })
    expect(storage.list).toHaveBeenCalledWith({ limit: 20, offset: 0 })
    expect(result).toEqual(memories)
  })

  it('should cap limit at 100', async () => {
    const storage = { list: vi.fn().mockResolvedValue([]) } as any
    const useCase = new ListMemoriesUseCase(storage)
    await useCase.execute({ limit: 200, offset: 0 })
    expect(storage.list).toHaveBeenCalledWith({ limit: 100, offset: 0 })
  })
})
```

```typescript
// packages/core/tests/use-cases/get-stats.test.ts
import { describe, expect, it, vi } from 'vitest'
import { GetStatsUseCase } from '../../src/use-cases/get-stats.js'

describe('GetStatsUseCase', () => {
  it('should return storage stats', async () => {
    const stats = { totalMemories: 42, totalSessions: 5, oldestMemory: null, newestMemory: null, averageContentLength: 150 }
    const storage = { getStats: vi.fn().mockResolvedValue(stats) } as any
    const useCase = new GetStatsUseCase(storage)
    const result = await useCase.execute()
    expect(result).toEqual(stats)
  })
})
```

```typescript
// packages/core/tests/use-cases/clear-memory.test.ts
import { describe, expect, it, vi } from 'vitest'
import { ClearMemoryUseCase } from '../../src/use-cases/clear-memory.js'

describe('ClearMemoryUseCase', () => {
  it('should call storage.clear()', async () => {
    const storage = { clear: vi.fn() } as any
    const useCase = new ClearMemoryUseCase(storage)
    await useCase.execute()
    expect(storage.clear).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/core && pnpm test
```
Expected: FAIL

- [ ] **Step 3: Implement all remaining use cases**

```typescript
// packages/core/src/use-cases/delete-memory.ts
import type { StorageRepository } from '../interfaces/storage-repository.js'
import { MemoryNotFoundError } from '../errors/memory-error.js'

export class DeleteMemoryUseCase {
  constructor(private readonly storage: StorageRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.storage.findById(id)
    if (!existing) throw new MemoryNotFoundError(id)
    await this.storage.delete(id)
  }
}
```

```typescript
// packages/core/src/use-cases/list-memories.ts
import type { Memory, ListOptions } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

const MAX_LIMIT = 100

export class ListMemoriesUseCase {
  constructor(private readonly storage: StorageRepository) {}

  async execute(options: ListOptions): Promise<Memory[]> {
    const sanitized = { ...options, limit: Math.min(options.limit, MAX_LIMIT) }
    return this.storage.list(sanitized)
  }
}
```

```typescript
// packages/core/src/use-cases/get-stats.ts
import type { StorageStats } from '../entities/memory.js'
import type { StorageRepository } from '../interfaces/storage-repository.js'

export class GetStatsUseCase {
  constructor(private readonly storage: StorageRepository) {}

  async execute(): Promise<StorageStats> {
    return this.storage.getStats()
  }
}
```

```typescript
// packages/core/src/use-cases/clear-memory.ts
import type { StorageRepository } from '../interfaces/storage-repository.js'

export class ClearMemoryUseCase {
  constructor(private readonly storage: StorageRepository) {}

  async execute(): Promise<void> {
    await this.storage.clear()
  }
}
```

```typescript
// packages/core/src/use-cases/index.ts
export { SaveMemoryUseCase } from './save-memory.js'
export { SearchMemoryUseCase } from './search-memory.js'
export { DeleteMemoryUseCase } from './delete-memory.js'
export { ListMemoriesUseCase } from './list-memories.js'
export { GetStatsUseCase } from './get-stats.js'
export { ClearMemoryUseCase } from './clear-memory.js'
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/core && pnpm test
```
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/use-cases/ packages/core/tests/use-cases/
git commit -m "feat(core): add DeleteMemory, ListMemories, GetStats, ClearMemory use cases"
```

---

## Task 10: Core Public API + Final Verification

**Files:**
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Create core public API barrel export**

```typescript
// packages/core/src/index.ts
// Entities
export type {
  Memory,
  MemoryMetadata,
  ListOptions,
  StorageStats,
  SearchResult,
  SearchFilter,
  Chunk,
  ConversationLog,
  ConversationMessage,
} from './entities/index.js'

// Interfaces
export type {
  EmbeddingProvider,
  StorageRepository,
  ChunkingStrategy,
} from './interfaces/index.js'

// Use Cases
export {
  SaveMemoryUseCase,
  SearchMemoryUseCase,
  DeleteMemoryUseCase,
  ListMemoriesUseCase,
  GetStatsUseCase,
  ClearMemoryUseCase,
} from './use-cases/index.js'

// Errors
export {
  MemoryError,
  MemoryNotFoundError,
  EmbeddingFailedError,
  StorageConnectionError,
} from './errors/index.js'

// Constants
export { SEARCH_DEFAULTS } from './constants.js'
```

- [ ] **Step 2: Build and verify**

```bash
cd packages/core && pnpm build
```
Expected: Success, dist/ created

- [ ] **Step 3: Run all tests with coverage**

```bash
cd packages/core && pnpm test:coverage
```
Expected: All tests pass, coverage >= 75%

- [ ] **Step 4: Run code quality checks**

```bash
pnpm lint && pnpm knip && pnpm dep-check
```
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): add public API exports and verify build"
```

---

## Task 11: CLAUDE.md + Documentation

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create CLAUDE.md**

```markdown
# CLAUDE.md

## AI固有の指示
- コミット時は Conventional Commits に従う（scope: core, embedding-onnx, storage-postgres, mcp-server, hooks）
- PRは必ず関連Issueを紐付ける
- 型定義変更時はJSDocも同時に更新する
- テストはTDDで書く（RED → GREEN → REFACTOR）

## プロジェクト設定
→ .project-config.yml

## ワークフロー（Skills）
- conventional-commits → コミット・ブランチルール
- github-flow → Issue・PR・Projects運用
- sdd → 仕様駆動開発フロー
- adr → ADR管理
- code-quality → 品質ツール設定
- diagram-management → 図の管理・CI生成

## プロジェクト固有のドキュメント
- docs/specs/ → 設計段階の仕様書
- docs/adr/ → 設計判断記録
- docs/diagrams/ → アーキテクチャ図
- docs/plans/ → 実装計画

## パッケージ構成
| パッケージ | 役割 |
|-----------|------|
| @claude-memory/core | ドメイン層（エンティティ、インターフェース、ユースケース） |
| @claude-memory/embedding-onnx | ONNX埋め込み実装 |
| @claude-memory/storage-postgres | PostgreSQL + pgvector + pg_bigm |
| @claude-memory/mcp-server | MCP Server + DI |
| @claude-memory/hooks | Claude Code Hooks連携 |

## コマンド
- `pnpm test` — 全パッケージテスト
- `pnpm lint` — OXLint + Biome
- `pnpm knip` — 未使用コード検出
- `pnpm dep-check` — 依存方向検証
- `pnpm build` — 全パッケージビルド
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with project overview and AI instructions"
```
