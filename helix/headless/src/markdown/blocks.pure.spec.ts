import { describe, expect, test } from 'bun:test'
import { cellsOf, parseBlocks } from './blocks.js'

const blocks = (text: string) => parseBlocks(text.split('\n')).blocks

describe('parseBlocks', () => {
  test('reads headings, paragraphs and rules', () => {
    expect(blocks('# One\n\nSome text\nover two lines\n\n---')).toEqual([
      { kind: 'heading', level: 1, text: 'One' },
      { kind: 'paragraph', text: 'Some text\nover two lines' },
      { kind: 'rule' },
    ])
  })

  test('reads no setext heading: a rule under a paragraph is a rule', () => {
    expect(blocks('Title\n---')).toEqual([{ kind: 'paragraph', text: 'Title' }, { kind: 'rule' }])
    expect(blocks('Title\n===')).toEqual([{ kind: 'paragraph', text: 'Title\n===' }])
  })

  test('reads four spaces of indent as text', () => {
    expect(blocks('    indented')).toEqual([{ kind: 'paragraph', text: 'indented' }])
  })

  test('reads a fence and its language, and one still open', () => {
    expect(blocks('```ts\nconst a = 1\n```')).toEqual([
      { info: 'ts', kind: 'code', open: false, text: 'const a = 1' },
    ])
    expect(blocks('~~~\nline one\nline two')).toEqual([
      { info: '', kind: 'code', open: true, text: 'line one\nline two' },
    ])
  })

  test('keeps a fence open against a shorter closing fence', () => {
    expect(blocks('````\n```\n````')).toEqual([
      { info: '', kind: 'code', open: false, text: '```' },
    ])
  })

  test('reads lists, nested lists and task items', () => {
    expect(blocks('- one\n- two\n  - deeper\n- [x] done\n- [ ] to do')).toEqual([
      {
        items: [
          { children: [{ kind: 'paragraph', text: 'one' }] },
          {
            children: [
              { kind: 'paragraph', text: 'two' },
              {
                items: [{ children: [{ kind: 'paragraph', text: 'deeper' }] }],
                kind: 'list',
                ordered: false,
                start: 1,
              },
            ],
          },
          { checked: true, children: [{ kind: 'paragraph', text: 'done' }] },
          { checked: false, children: [{ kind: 'paragraph', text: 'to do' }] },
        ],
        kind: 'list',
        ordered: false,
        start: 1,
      },
    ])
  })

  test('reads an ordered list from its first number, and a loose list as one list', () => {
    const [list] = blocks('3. three\n\n4. four')
    expect(list).toMatchObject({ kind: 'list', ordered: true, start: 3 })
    expect(list?.kind === 'list' ? list.items.length : 0).toBe(2)
  })

  test('ends a list at a different bullet, and a paragraph at a list item', () => {
    expect(blocks('- a\n* b').map((block) => block.kind)).toEqual(['list', 'list'])
    expect(blocks('text\n- item').map((block) => block.kind)).toEqual(['paragraph', 'list'])
    /* Only a list counting from 1 interrupts a paragraph. */
    expect(blocks('the year\n1999. was').map((block) => block.kind)).toEqual(['paragraph'])
  })

  test('continues a list item paragraph with a lazy line', () => {
    expect(blocks('- one\ncontinued')).toEqual([
      {
        items: [{ children: [{ kind: 'paragraph', text: 'one\ncontinued' }] }],
        kind: 'list',
        ordered: false,
        start: 1,
      },
    ])
  })

  test('reads a quote, and an alert as a quote with its kind', () => {
    expect(blocks('> quoted\nlazy')).toEqual([
      { children: [{ kind: 'paragraph', text: 'quoted\nlazy' }], kind: 'quote' },
    ])
    expect(blocks('> [!WARNING]\n> Careful.')).toEqual([
      { alert: 'warning', children: [{ kind: 'paragraph', text: 'Careful.' }], kind: 'quote' },
    ])
  })

  test('reads a table, its alignment, and rows padded to the header', () => {
    expect(blocks('| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 |')).toEqual([
      {
        align: ['start', 'center', 'end'],
        head: ['a', 'b', 'c'],
        kind: 'table',
        rows: [['1', '2', '']],
      },
    ])
  })

  test('reads a table that interrupts a paragraph, and no table without its delimiter row', () => {
    expect(blocks('text\n| a |\n| - |').map((block) => block.kind)).toEqual(['paragraph', 'table'])
    expect(blocks('| a | b |\n| - |').map((block) => block.kind)).toEqual(['paragraph'])
  })

  test('says where each top-level block starts', () => {
    expect(parseBlocks(['# a', '', 'b', 'c', '- d']).starts).toEqual([0, 2, 4])
  })
})

describe('cellsOf', () => {
  test('splits at pipes, keeps an escaped one, and drops the outer pair', () => {
    expect(cellsOf('| a | b \\| c |')).toEqual(['a', 'b | c'])
    expect(cellsOf('a|b')).toEqual(['a', 'b'])
  })
})
