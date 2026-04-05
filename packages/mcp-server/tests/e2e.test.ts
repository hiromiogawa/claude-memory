import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createContainer } from '../src/container.js'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5434/claude_memory_test'

describe('E2E: full memory lifecycle', () => {
  const config = {
    databaseUrl: DATABASE_URL,
    embeddingModel: 'intfloat/multilingual-e5-small',
    embeddingDimension: 384,
    logLevel: 'error',
    dbPoolSize: 5,
  }

  let container: ReturnType<typeof createContainer>

  beforeAll(() => {
    container = createContainer(config)
  })

  afterAll(async () => {
    await container.storage.close()
  })

  beforeEach(async () => {
    await container.clearMemory.execute()
  })

  it('save -> search -> update -> delete lifecycle', async () => {
    // 1. Save
    const saveResult = await container.saveMemory.saveManual({
      content: 'TypeScriptでジェネリクスを使うとき、constraintを付けるとよい',
      sessionId: 'e2e-session',
      projectPath: '/e2e/project',
      tags: ['typescript', 'tips'],
    })
    expect(saveResult.saved).toBe(true)

    // 2. Search
    const searchResults = await container.searchMemory.search('TypeScript ジェネリクス', 10)
    expect(searchResults.length).toBeGreaterThan(0)
    expect(searchResults[0]!.memory.content).toContain('ジェネリクス')

    const memoryId = searchResults[0]!.memory.id

    // 3. Update
    await container.updateMemory.execute({
      id: memoryId,
      content: 'TypeScriptのジェネリクスにはextendsでconstraintを付ける',
      tags: ['typescript', 'generics'],
    })

    // 4. Verify update
    const listResults = await container.listMemories.execute({ limit: 10, offset: 0 })
    const updated = listResults.find((m) => m.id === memoryId)
    expect(updated!.content).toContain('extends')
    expect(updated!.metadata.tags).toContain('generics')

    // 5. Stats
    const stats = await container.getStats.execute()
    expect(stats.totalMemories).toBe(1)

    // 6. Delete
    await container.deleteMemory.execute(memoryId)
    const afterDelete = await container.listMemories.execute({ limit: 10, offset: 0 })
    expect(afterDelete).toHaveLength(0)
  })

  it('duplicate save is skipped', async () => {
    await container.saveMemory.saveManual({
      content: 'これはテスト用の記憶です',
      sessionId: 'e2e-session',
    })

    const result = await container.saveMemory.saveManual({
      content: 'これはテスト用の記憶です',
      sessionId: 'e2e-session',
    })
    expect(result.saved).toBe(false)
  })

  it('export and import roundtrip', async () => {
    await container.saveMemory.saveManual({
      content: 'エクスポートテスト',
      sessionId: 'e2e-session',
      tags: ['export'],
    })

    const exported = await container.exportMemory.execute()
    expect(exported).toHaveLength(1)

    await container.clearMemory.execute()

    const importResult = await container.importMemory.execute(exported)
    expect(importResult.imported).toBe(1)

    const afterImport = await container.listMemories.execute({ limit: 10, offset: 0 })
    expect(afterImport).toHaveLength(1)
    expect(afterImport[0]!.content).toBe('エクスポートテスト')
  })
})
