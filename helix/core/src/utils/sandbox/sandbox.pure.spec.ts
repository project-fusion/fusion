import { describe, expect, test } from 'bun:test'
import { caretWords, drawnRuns, languageName, linesOfRuns, sourceRuns } from './sandbox.js'

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

describe('sourceRuns', () => {
  test('a source without a tokenizer is one plain run', () => {
    expect(sourceRuns('a\nb', 'html', undefined)).toEqual([{ kind: undefined, text: 'a\nb' }])
  })

  test('a tokenizer that throws leaves the source plain, and the throw is reported', () => {
    const reported = globalThis.reportError
    const heard: unknown[] = []
    globalThis.reportError = (error) => heard.push(error)
    const throws = (): never => {
      throw new Error('no')
    }
    expect(sourceRuns('x', 'css', throws)).toEqual([{ kind: undefined, text: 'x' }])
    globalThis.reportError = reported
    expect(heard).toHaveLength(1)
  })
})

describe('linesOfRuns', () => {
  test('a run that crosses a line break is cut, and an empty line holds no run', () => {
    expect(
      linesOfRuns([
        { kind: 'tag', text: 'a\n\nb' },
        { kind: undefined, text: 'c' },
      ]),
    ).toEqual([
      [{ kind: 'tag', text: 'a' }],
      [],
      [
        { kind: 'tag', text: 'b' },
        { kind: undefined, text: 'c' },
      ],
    ])
  })
})

describe('languageName', () => {
  test('a language an editor knows is named, and any other word is kept', () => {
    expect(languageName('html')).toBe('HTML')
    expect(languageName('rust')).toBe('rust')
    expect(languageName('constructor')).toBe('constructor')
  })
})

describe('caretWords', () => {
  test('says the line and the column without grouping, and nothing without both', () => {
    expect(caretWords('Ln {line}, Col {column}', 1200, 4)).toBe('Ln 1200, Col 4')
    expect(caretWords('Ln {line}, Col {column}', 3, undefined)).toBeUndefined()
  })
})
