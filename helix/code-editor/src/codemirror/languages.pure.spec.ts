import { describe, expect, test } from 'bun:test'
import { languageName, languageNames } from './codemirror-engine.js'

describe('languageName', () => {
  test('reads a language by its name or an alias, in any case', () => {
    expect(languageName('TypeScript')).toBe('ts')
    expect(languageName('markdown')).toBe('md')
    expect(languageName(' rust ')).toBe('rs')
    expect(languageName('zsh')).toBe('sh')
    expect(languageName('json')).toBe('json')
  })

  test('reads plain text, and a name no grammar answers, as no language', () => {
    expect(languageName('')).toBeUndefined()
    expect(languageName('cobol')).toBeUndefined()
  })

  test('lists every name it takes', () => {
    expect(languageNames()).toContain('python')
    expect(languageNames()).toContain('tsx')
  })
})
