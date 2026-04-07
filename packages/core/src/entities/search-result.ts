import type { Memory } from './memory.js'

/** 検索クエリから返された記憶と関連スコア。 */
export interface SearchResult {
  /** マッチした記憶エントリ。 */
  memory: Memory
  /** RRF fusionと時間減衰後の関連スコア（高いほど良い）。 */
  score: number
  /** マッチの種別: keyword のみ、vector のみ、またはその両方。 */
  matchType: 'keyword' | 'vector' | 'hybrid'
}

/** 検索クエリに適用するフィルター条件。 */
export interface SearchFilter {
  /** 結果を特定のプロジェクトパスに限定する。 */
  projectPath?: string
  /** 作成ソースでフィルター。 */
  source?: 'manual' | 'auto'
  /** タグでフィルター。 */
  tags?: string[]
}
