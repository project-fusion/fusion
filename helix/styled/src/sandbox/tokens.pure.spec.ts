import { describe, expect, test } from 'bun:test'
import { drawnRuns } from './tokens.js'

describe('drawnRuns', () => {
  test('each run keeps its kind, and plain text has none', () => {
    expect(drawnRuns('<p>', [{ text: '<' }, { kind: 'tag', text: 'p' }, { text: '>' }])).toEqual([
      { kind: undefined, text: '<' },
      { kind: 'tag', text: 'p' },
      { kind: undefined, text: '>' },
    ])
  })

  test('runs that do not add up to the source are drawn as the source, plain', () => {
    expect(drawnRuns('a b', [{ kind: 'name', text: 'a' }, { text: 'b' }])).toEqual([
      { kind: undefined, text: 'a b' },
    ])
  })

  test('a kind becomes letters, digits and hyphens, whatever it holds', () => {
    expect(drawnRuns('x', [{ kind: 'Tok Keyword', text: 'x' }])).toEqual([
      { kind: 'tok-keyword', text: 'x' },
    ])
  })
})
