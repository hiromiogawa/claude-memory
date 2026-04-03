import type { Memory } from './memory.js'

export interface SearchResult {
  memory: Memory
  score: number
  matchType: 'keyword' | 'vector' | 'hybrid'
}

export interface SearchFilter {
  projectPath?: string
  source?: 'manual' | 'auto'
}
