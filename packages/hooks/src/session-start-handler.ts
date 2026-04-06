import type { SearchFilter, SearchResult } from '@claude-memory/core'

const SESSION_START_SEARCH_LIMIT = 5

interface SearchCapable {
  search(query: string, limit: number, filter?: SearchFilter): Promise<SearchResult[]>
}

export class SessionStartHandler {
  constructor(private readonly searchUseCase: SearchCapable) {}

  async handle(projectPath?: string): Promise<string> {
    const filter: SearchFilter | undefined = projectPath ? { projectPath } : undefined
    const results = await this.searchUseCase.search(
      'project context',
      SESSION_START_SEARCH_LIMIT,
      filter,
    )

    if (results.length === 0) {
      return 'No relevant memories found.'
    }

    const formatted = results
      .map((r, i) => `[${i + 1}] (score: ${r.score.toFixed(2)}) ${r.memory.content}`)
      .join('\n\n')

    return `## Previous session context:\n\n${formatted}`
  }
}
