import { describe, expect, it } from 'vitest'
import { generateMarkdown } from './generate-docs.js'

describe('generateMarkdown', () => {
  const markdown = generateMarkdown()

  it('includes auto-generated header warning', () => {
    expect(markdown).toContain('このファイルは自動生成です。手動で編集しないでください。')
  })

  it('generates sections for all 10 tools', () => {
    const toolNames = [
      'memory_save',
      'memory_search',
      'memory_list',
      'memory_update',
      'memory_delete',
      'memory_cleanup',
      'memory_import',
      'memory_export',
      'memory_stats',
      'memory_clear',
    ]
    for (const name of toolNames) {
      expect(markdown).toContain(`### ${name}`)
    }
  })

  it('includes argument tables for tools with schemas', () => {
    // memory_save has 'content' arg
    expect(markdown).toContain('| content | string | Yes |')
    // memory_search has 'query' arg
    expect(markdown).toContain('| query | string | Yes |')
    // memory_search has 'allProjects' with describe()
    expect(markdown).toContain('Search across all projects')
  })

  it('includes table headers for tools with args', () => {
    expect(markdown).toContain('| 引数 | 型 | 必須 | デフォルト | 説明 |')
  })

  it('marks tools without arguments as 引数なし', () => {
    // memory_export, memory_stats, memory_clear have null schema
    const sections = markdown.split('### ')
    const exportSection = sections.find((s) => s.startsWith('memory_export'))
    expect(exportSection).toContain('引数なし')

    const statsSection = sections.find((s) => s.startsWith('memory_stats'))
    expect(statsSection).toContain('引数なし')

    const clearSection = sections.find((s) => s.startsWith('memory_clear'))
    expect(clearSection).toContain('引数なし')
  })

  it('resolves optional args as not required', () => {
    // tags in memory_save is optional
    expect(markdown).toContain('| tags | string[] | No | - | - |')
  })

  it('resolves default values', () => {
    // scope in memory_save defaults to "project"
    expect(markdown).toContain('| scope |')
    expect(markdown).toContain('"project"')
  })

  it('resolves enum types', () => {
    // scope is enum(['project', 'global'])
    expect(markdown).toContain('"project" \\| "global"')
  })
})
