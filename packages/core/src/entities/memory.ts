export interface Memory {
  /** UUID v4 */
  id: string
  /** Q&Aペアのテキスト。空文字不可 */
  content: string
  /** ベクトル表現。list取得時はnull（大きなペイロードのため） */
  embedding: number[] | null
  metadata: MemoryMetadata
  createdAt: Date
  updatedAt: Date
  /** 最終アクセス日時。検索結果として返された際に更新される */
  lastAccessedAt: Date
  /** 検索でヒットした累計回数。検索スコアのブーストに使用される */
  accessCount: number
}

/** 保存済み記憶エントリに関連するメタデータ。 */
export interface MemoryMetadata {
  /** この記憶を生成したセッションID。 */
  sessionId: string
  /** この記憶が属するプロジェクトのファイルシステムパス。 */
  projectPath?: string
  /** 分類用のユーザー定義タグ。 */
  tags?: string[]
  /** 記憶の作成方法。 */
  source: 'manual' | 'auto'
  /** 記憶の公開スコープ。'project'（デフォルト）は projectPath に限定、'global' は全プロジェクト共有。 */
  scope?: 'project' | 'global'
}

/** 記憶一覧取得のページネーションとフィルターオプション。 */
export interface ListOptions {
  /** 取得件数。デフォルト: 20、最大: 100。 */
  limit: number
  /** スキップ件数。デフォルト: 0。 */
  offset: number
  /** 作成ソースでフィルター。 */
  source?: 'manual' | 'auto'
  /** タグでフィルター。 */
  tags?: string[]
  /** セッションIDでフィルター。 */
  sessionId?: string
  /** ソート対象フィールド。 */
  sortBy?: 'createdAt' | 'updatedAt'
  /** ソート方向。 */
  sortOrder?: 'asc' | 'desc'
}

/** 記憶ストレージの集計統計情報。 */
export interface StorageStats {
  /** 保存済み記憶の総件数。 */
  totalMemories: number
  /** 異なるセッションの総数。 */
  totalSessions: number
  /** 最古の記憶の作成日時。空の場合は null。 */
  oldestMemory: Date | null
  /** 最新の記憶の作成日時。空の場合は null。 */
  newestMemory: Date | null
  /** 記憶コンテンツの平均文字数。 */
  averageContentLength: number
  /** 手動作成の記憶の総件数。 */
  manualCount: number
  /** 自動作成の記憶の総件数。 */
  autoCount: number
}
