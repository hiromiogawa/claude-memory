import type { SearchFilter, SearchResult } from '@claude-memory/core'

const SESSION_START_SEARCH_LIMIT = 5

interface SearchCapable {
  search(query: string, limit: number, filter?: SearchFilter): Promise<SearchResult[]>
}

/** セッション開始時に関連メモリを検索してコンテキスト再現用にフォーマットするハンドラ。 */
export class SessionStartHandler {
  /**
   * SessionStartHandlerの新しいインスタンスを生成する。
   * @param searchUseCase - メモリを検索するユースケース
   */
  constructor(private readonly searchUseCase: SearchCapable) {}

  /**
   * 関連メモリを検索し、フォーマットされたコンテキスト文字列を返す。
   * @param projectPath - 検索スコープを絞るプロジェクトパス（省略可）
   * @returns 関連メモリのフォーマット済み文字列、または結果なしメッセージ
   */
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
