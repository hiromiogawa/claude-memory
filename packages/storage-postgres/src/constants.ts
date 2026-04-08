/** PostgreSQLパラメータ上限(65535)を考慮したbulk insert時のチャンクサイズ（1行あたり約12パラメータ） */
export const BULK_INSERT_CHUNK_SIZE = 500

/** デフォルトのコネクションプール最大数 */
export const DEFAULT_MAX_CONNECTIONS = 10
