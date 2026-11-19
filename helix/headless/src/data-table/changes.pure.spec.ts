import { describe, expect, test } from 'bun:test'
import type { DataRow } from '@fusion.dev/helix-core'
import { changedKeys, everyRow, rowsByKey, sameData } from './changes.js'

const byId = (rows: DataRow[]) => rowsByKey(rows, (row) => row.id as string | undefined)

describe('sameData', () => {
  test('holds two rows with equal values the same, however deep', () => {
    expect(sameData({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } })).toBe(true)
    expect(sameData({ at: new Date(0) }, { at: new Date(0) })).toBe(true)
    expect(sameData({ a: Number.NaN }, { a: Number.NaN })).toBe(true)
  })

  test('tells a value that differs, one that is missing, and an array from an object', () => {
    expect(sameData({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 3] } })).toBe(false)
    expect(sameData({ a: 1, b: undefined }, { a: 1, c: undefined })).toBe(false)
    expect(sameData({ a: [] }, { a: {} })).toBe(false)
  })

  test('leaves out the member it is told to skip', () => {
    expect(
      sameData({ children: [1], name: 'src' }, { children: [2], name: 'src' }, 'children'),
    ).toBe(true)
  })

  test('stops at a cycle', () => {
    const a: Record<string, unknown> = { name: 'a' }
    a.self = a
    const b: Record<string, unknown> = { name: 'a' }
    b.self = b
    expect(sameData(a, b)).toBe(false)
  })
})

describe('everyRow', () => {
  test('walks the rows under each row in reading order', () => {
    const rows = [{ id: 'src', kids: [{ id: 'lib', kids: [{ id: 'deep' }] }] }, { id: 'readme' }]
    expect(everyRow(rows, 'kids').map((row) => row.id)).toEqual(['src', 'lib', 'deep', 'readme'])
    expect(everyRow(rows, '')).toHaveLength(2)
  })
})

describe('changedKeys', () => {
  const before = byId([
    { id: 'a', size: 1 },
    { id: 'b', size: 2 },
  ])

  test('names a row whose data changed and a row that arrived, and not a row fetched again', () => {
    const now = byId([
      { id: 'a', size: 1 },
      { id: 'b', size: 3 },
      { id: 'c', size: 4 },
    ])
    expect([...changedKeys(before, now, { arrivals: true })]).toEqual(['b', 'c'])
    expect([...changedKeys(before, now, { arrivals: false })]).toEqual(['b'])
  })

  test('names no row a table wrote itself', () => {
    const saved = { id: 'b', size: 5 }
    const now = byId([{ id: 'a', size: 1 }, saved])
    expect([...changedKeys(before, now, { arrivals: true, own: (row) => row === saved })]).toEqual(
      [],
    )
  })

  test('names nothing when no key is in both, which is new data', () => {
    const now = byId([{ id: 'x' }, { id: 'y' }])
    expect(changedKeys(before, now, { arrivals: true }).size).toBe(0)
  })
})
