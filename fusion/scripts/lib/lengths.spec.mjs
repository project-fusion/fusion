import { describe, expect, test } from 'bun:test'
import { judge, lines } from './lengths.mjs'

describe('lines', () => {
  test('counts as wc -l does, a final newline ending the last line', () => {
    expect(lines('')).toBe(0)
    expect(lines('one\n')).toBe(1)
    expect(lines('one\ntwo')).toBe(2)
    expect(lines('one\ntwo\n')).toBe(2)
  })
})

describe('judge', () => {
  const lengths = new Map([
    ['a.ts', 401],
    ['b.ts', 400],
    ['c.rs', 900],
    ['d.ts', 12],
  ])

  test('a long file that is not listed is over, and a listed one is allowed', () => {
    expect(judge(lengths, ['c.rs'])).toEqual({
      held: 2,
      off: [],
      over: [{ count: 401, path: 'a.ts' }],
    })
  })

  test('a listed file that is gone or now short comes off the list', () => {
    expect(judge(lengths, ['a.ts', 'b.ts', 'c.rs', 'gone.ts']).off).toEqual(['b.ts', 'gone.ts'])
  })

  test('a file at the limit holds to it', () => {
    expect(judge(new Map([['b.ts', 400]]), [])).toEqual({ held: 1, off: [], over: [] })
  })
})
