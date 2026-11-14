import { describe, expect, test } from 'bun:test'
import { grid } from './reads.js'
import type { Resolution } from './resolved.js'

/** A grid's resolved style, with one column track and `rows`. */
const oneColumn = (rows?: string): Map<string, Resolution> =>
  new Map<string, Resolution>([
    ['display', 'grid'],
    ['grid-template-columns', 'minmax(0, 1fr)'],
    ...(rows === undefined ? [] : [['grid-template-rows', rows] as [string, Resolution]]),
  ])

describe('grid', () => {
  test('lays a grid of one column out as a column of views', () => {
    const resolved = oneColumn('auto minmax(0, 1fr)')
    expect(grid(resolved, true)).toBeUndefined()
    expect(resolved.get('flex-direction')).toBe('column')
  })

  test('hands a grid of one column whose rows have lengths to the native grid, which sizes the rows', () => {
    const resolved = oneColumn('repeat(5, minmax(30rem, auto))')
    expect(grid(resolved, true)).toEqual({
      columns: 'minmax(0, 1fr)',
      rows: 'repeat(5, minmax(30rem, auto))',
    })
  })

  test('keeps a grid of one column whose content is more than one region a column, whatever its rows', () => {
    expect(grid(oneColumn('3rem auto'), false)).toBeUndefined()
  })
})
