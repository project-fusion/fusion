import { describe, expect, test } from 'bun:test'
import {
  closeBracket,
  deletePair,
  indentLines,
  manifestWords,
  matchBracket,
  outdentLines,
  type SourceEdit,
  suggest,
  syntaxOf,
  toggleComment,
} from './editing.js'

/** The source after an edit, and the selection in it. */
const apply = (source: string, edit: SourceEdit | undefined): [string, readonly number[]] => {
  if (!edit) {
    return [source, []]
  }
  return [`${source.slice(0, edit.from)}${edit.text}${source.slice(edit.to)}`, edit.selection]
}

describe('indenting lines', () => {
  test('indents every line a selection touches, and keeps the selection on its text', () => {
    const source = 'a\nb\n\nc'
    expect(apply(source, indentLines(source, 0, source.length))).toEqual([
      '  a\n  b\n\n  c',
      [0, 12],
    ])
  })

  test('leaves the line a selection ends at the start of', () => {
    expect(apply('a\nb', indentLines('a\nb', 0, 2))).toEqual(['  a\nb', [0, 4]])
    expect(apply('ab', indentLines('ab', 1, 1))).toEqual(['  ab', [3, 3]])
  })

  test('outdents by two spaces or a tab, and does nothing to a line at the margin', () => {
    const source = '    a\n\tb\nc'
    expect(apply(source, outdentLines(source, 0, source.length))[0]).toBe('  a\nb\nc')
    expect(outdentLines('c', 0, 0)).toBeUndefined()
  })
})

describe('toggling comments', () => {
  test('reads the syntax from a name or a file name', () => {
    expect(syntaxOf('html')).toBe('html')
    expect(syntaxOf('styles.css')).toBe('css')
    expect(syntaxOf('utils.mjs')).toBe('js')
    expect(syntaxOf('App.tsx')).toBe('js')
    expect(syntaxOf('package.json')).toBeUndefined()
  })

  test('comments script lines at the indentation they share, and uncomments them', () => {
    const source = '  a()\n    b()'
    const [on] = apply(source, toggleComment(source, 0, source.length, 'js'))
    expect(on).toBe('  // a()\n  //   b()')
    expect(apply(on, toggleComment(on, 0, on.length, 'js'))[0]).toBe(source)
  })

  test('puts one block comment around markup and stylesheet lines, and takes it off', () => {
    const [on, selection] = apply('  <p>Hi</p>', toggleComment('  <p>Hi</p>', 5, 5, 'html'))
    expect(on).toBe('  <!-- <p>Hi</p> -->')
    expect(selection).toEqual([10, 10])
    expect(apply(on, toggleComment(on, 10, 10, 'html'))).toEqual(['  <p>Hi</p>', [5, 5]])
    expect(apply('p { }', toggleComment('p { }', 0, 0, 'css'))[0]).toBe('/* p { } */')
  })
})

describe('closing brackets', () => {
  test('closes a bracket or quote typed before a space or the end of a line', () => {
    expect(apply('f', closeBracket('f', 1, 1, '('))).toEqual(['f()', [2, 2]])
    expect(apply('a ', closeBracket('a ', 2, 2, '"'))).toEqual(['a ""', [3, 3]])
    expect(closeBracket('ab', 1, 1, '(')).toBeUndefined()
  })

  test('wraps a selection', () => {
    expect(apply('ab', closeBracket('ab', 0, 2, '['))).toEqual(['[ab]', [1, 3]])
  })

  test('steps over the closing character typed before itself', () => {
    expect(apply('()', closeBracket('()', 1, 1, ')'))).toEqual(['()', [2, 2]])
    expect(apply('""', closeBracket('""', 1, 1, '"'))).toEqual(['""', [2, 2]])
  })

  test('types an apostrophe after a letter', () => {
    expect(closeBracket('don', 3, 3, "'")).toBeUndefined()
    expect(closeBracket('a', 1, 1, 'x')).toBeUndefined()
  })

  test('deletes an empty pair with one Backspace', () => {
    expect(apply('f()', deletePair('f()', 2, 2))).toEqual(['f', [1, 1]])
    expect(deletePair('f(a)', 3, 3)).toBeUndefined()
  })
})

describe('matching brackets', () => {
  test('pairs the bracket before the caret, then the one after it', () => {
    expect(matchBracket('a(b[c]d)', 8)).toEqual({ at: 7, match: 1 })
    expect(matchBracket('a(b[c]d)', 1)).toEqual({ at: 1, match: 7 })
    expect(matchBracket('a(b', 2)).toEqual({ at: 1, match: undefined })
    expect(matchBracket('ab', 1)).toBeUndefined()
  })

  test('leaves out brackets inside strings and comments', () => {
    const source = '(")")'
    expect(matchBracket(source, 0, (index) => index >= 1 && index <= 3)).toEqual({
      at: 0,
      match: 4,
    })
  })
})

describe('completion', () => {
  test('offers the longer words in the source and the extra list that start with the word typed', () => {
    expect(suggest('console.log(x)\ncon', 18, ['const', 'helix-button'])).toEqual({
      from: 15,
      words: ['console', 'const'],
    })
    expect(suggest('<helix-b', 8, ['helix-button', 'helix-badge'])).toEqual({
      from: 1,
      words: ['helix-badge', 'helix-button'],
    })
  })

  test('offers nothing after a space or where nothing completes the word', () => {
    expect(suggest('a ', 2)).toBeUndefined()
    expect(suggest('zebra', 5)).toBeUndefined()
  })

  test('reads tag, attribute and custom property names from a manifest, once each', () => {
    const manifest = {
      modules: [
        {
          declarations: [
            {
              attributes: [{ name: 'variant' }, { name: 'size' }],
              cssProperties: [{ name: '--button-color' }],
              tagName: 'helix-button',
            },
            { attributes: [{ name: 'size' }], tagName: 'helix-badge' },
          ],
        },
      ],
    }
    expect(manifestWords(manifest)).toEqual([
      'helix-button',
      'variant',
      'size',
      '--button-color',
      'helix-badge',
    ])
  })
})
