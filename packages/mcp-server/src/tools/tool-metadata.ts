import { SEARCH_DEFAULTS } from '@claude-memory/core'
import { z } from 'zod'

/** MCPツールの名前・説明・入力schemaを記述するメタデータ。 */
interface ToolMetadata {
  name: string
  description: string
  schema: z.ZodRawShape | null
}

/** memory_saveツールの入力パラメータを定義するZod schema。 */
export const memorySaveSchema = {
  content: z.string().min(1),
  sessionId: z.string(),
  projectPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
  scope: z.enum(['project', 'global']).optional().default('project'),
}

/** memory_searchツールの入力パラメータを定義するZod schema。 */
export const memorySearchSchema = {
  query: z.string().min(1),
  limit: z.number().optional().default(SEARCH_DEFAULTS.maxResults),
  projectPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
  allProjects: z
    .boolean()
    .optional()
    .default(false)
    .describe('Search across all projects instead of scoping to projectPath'),
}

/** memory_listツールの入力パラメータを定義するZod schema。 */
export const memoryListSchema = {
  limit: z.number().optional().default(SEARCH_DEFAULTS.maxResults),
  offset: z.number().optional().default(0),
  source: z.enum(['manual', 'auto']).optional(),
  tags: z.array(z.string()).optional(),
}

/** memory_updateツールの入力パラメータを定義するZod schema。 */
export const memoryUpdateSchema = {
  id: z.string().uuid(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
}

/** memory_deleteツールの入力パラメータを定義するZod schema。 */
export const memoryDeleteSchema = {
  id: z.string().uuid(),
}

/** memory_cleanupツールの入力パラメータを定義するZod schema。 */
export const memoryCleanupSchema = {
  olderThanDays: z.number().min(1).describe('Delete memories not accessed in this many days'),
  dryRun: z
    .boolean()
    .optional()
    .default(true)
    .describe('Preview what would be deleted without actually deleting'),
}

/** memory_importツールの入力パラメータを定義するZod schema。 */
export const memoryImportSchema = {
  data: z.string().min(1).describe('JSON string of exported memories array'),
}

/** 全MCPツール定義（名前・説明・schema）のレジストリ。 */
export const TOOL_METADATA: ToolMetadata[] = [
  {
    name: 'memory_save',
    description: 'Save a manual memory entry',
    schema: memorySaveSchema,
  },
  {
    name: 'memory_search',
    description: 'Search memories with hybrid search (keyword + vector)',
    schema: memorySearchSchema,
  },
  {
    name: 'memory_list',
    description: 'List memories with pagination',
    schema: memoryListSchema,
  },
  {
    name: 'memory_update',
    description: 'Update an existing memory (content and/or tags)',
    schema: memoryUpdateSchema,
  },
  {
    name: 'memory_delete',
    description: 'Delete a memory by ID',
    schema: memoryDeleteSchema,
  },
  {
    name: 'memory_cleanup',
    description: 'Delete old memories that have not been accessed recently',
    schema: memoryCleanupSchema,
  },
  {
    name: 'memory_import',
    description: 'Import memories from JSON backup (re-computes embeddings)',
    schema: memoryImportSchema,
  },
  {
    name: 'memory_export',
    description: 'Export all memories as JSON for backup',
    schema: null,
  },
  {
    name: 'memory_stats',
    description: 'Get memory storage statistics',
    schema: null,
  },
  {
    name: 'memory_clear',
    description: 'Clear all memories',
    schema: null,
  },
]
