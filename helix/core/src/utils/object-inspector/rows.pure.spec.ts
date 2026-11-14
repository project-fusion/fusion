import { describe, expect, test } from 'bun:test'
import {
  ancestorsOf,
  child,
  cursorFor,
  flatten,
  search,
  seed,
  siblingBranches,
  withAncestors,
} from './rows.js'

const VALUE = { a: { b: 'Main', 'c/d': [1, 'x'] }, e: null }

describe('paths', () => {
  test('a key holding a slash or a tilde is escaped as a JSON Pointer escapes it', () => {
    expect(child('/a', 'c/d~')).toBe('/a/c~1d~0')
  })

  test('every branch above a path, from the root down, and not the path itself', () => {
    expect(ancestorsOf('/a/c~1d/0')).toEqual(['', '/a', '/a/c~1d'])
    expect(ancestorsOf('')).toEqual([])
  })
})

describe('search', () => {
  test('finds keys and leaf values in the whole value, ignoring case', () => {
    expect([...search(VALUE, 'main')]).toEqual(['/a/b'])
    expect([...search(VALUE, 'C/')]).toEqual(['/a/c~1d'])
    expect([...search(VALUE, 'null')]).toEqual(['/e'])
  })

  test('finds nothing for an empty query, or with no value', () => {
    expect(search(VALUE, '  ').size).toBe(0)
    expect(search(undefined, 'a').size).toBe(0)
  })
})

describe('flatten', () => {
  test('without a filter, shows each open branch whole', () => {
    expect(flatten(VALUE, new Set(['', '/a'])).map((row) => row.path)).toEqual([
      '',
      '/a',
      '/a/b',
      '/a/c~1d',
      '/e',
    ])
  })

  test('with a filter, shows the matches and the way to them, counted among themselves', () => {
    const rows = flatten(VALUE, new Set(['', '/a']), search(VALUE, 'main'))
    expect(rows.map((row) => [row.path, row.position, row.siblings, row.match])).toEqual([
      ['', 1, 1, false],
      ['/a', 1, 1, false],
      ['/a/b', 1, 1, true],
    ])
  })

  test('shows everything under a matched branch that is open', () => {
    const rows = flatten(VALUE, new Set(['', '/a', '/a/c~1d']), search(VALUE, 'c/d'))
    expect(rows.map((row) => row.path)).toEqual(['', '/a', '/a/c~1d', '/a/c~1d/0', '/a/c~1d/1'])
  })

  test('shows no row when nothing matches', () => {
    expect(flatten(VALUE, new Set(['']), new Set())).toEqual([])
  })
})

describe('seed', () => {
  test('opens the branches shallower than the depth', () => {
    expect([...seed(VALUE, 2).opened]).toEqual(['', '/a'])
  })

  test('keeps whether a known branch was open, and gives a new one the default', () => {
    const { branches } = seed({ a: {} }, 1)
    const next = seed({ a: {}, b: {} }, 2, branches, new Set(['']))
    expect([...next.opened]).toEqual(['', '/b'])
  })
})

describe('cursorFor', () => {
  const value = { a: { b: { c: 1 } }, d: 2 }
  const rowsOf = (opened: string[], found?: Set<string>) => flatten(value, new Set(opened), found)

  test('stays on the path where it is still shown', () => {
    const rows = rowsOf(['', '/a'])
    expect(rows[cursorFor(rows, '/a/b', 0, false)]?.path).toBe('/a/b')
  })

  test('moves to the nearest branch around a path that closed', () => {
    const rows = rowsOf([''])
    expect(rows[cursorFor(rows, '/a/b/c', 3, false)]?.path).toBe('/a')
  })

  test('moves to the first match where a filter hid the path', () => {
    const rows = rowsOf(['', '/a', '/a/b'], new Set(['/d']))
    expect(rows[cursorFor(rows, '/a/b/c', 0, true)]?.path).toBe('/d')
  })

  test('holds the cursor inside the rows with no path to keep', () => {
    const rows = rowsOf([''])
    expect(cursorFor(rows, undefined, 9, false)).toBe(2)
    expect(cursorFor([], undefined, 9, false)).toBe(0)
  })
})

describe('withAncestors', () => {
  test('opens every branch around each path that the value has', () => {
    const opened = withAncestors(new Set(['/x']), new Set(['', '/a', '/a/b']), ['/a/b/c', '/q/r'])
    expect([...opened].sort()).toEqual(['', '/a', '/a/b', '/x'])
  })
})

describe('siblingBranches', () => {
  test('names the closed branches beside a row under the same parent', () => {
    const rows = flatten({ a: {}, b: [1], c: 3, d: { e: {} } }, new Set(['', '/d']))
    const a = rows.find((row) => row.path === '/a') as (typeof rows)[number]
    expect(siblingBranches(rows, a)).toEqual(['/a', '/b'])
  })
})
