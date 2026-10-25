import { describe, expect, test } from 'bun:test'
import { rangeExtend } from './range-extend.js'

/* Five items, `c` one a reader cannot choose. */
const items = ['a', 'b', 'c', 'd', 'e']
const choosable = ['a', 'b', 'd', 'e']
const range = (anchor: string | undefined, reached: string | undefined, to: string) => ({
  anchor,
  choosable,
  items,
  reached,
  to,
})

describe('a Shift range, as React Aria extends a selection', () => {
  test('takes in every item a reader can choose from the anchor, after what was selected', () => {
    expect(rangeExtend(['e'], range('a', undefined, 'b'))).toEqual(['e', 'a', 'b'])
    expect(rangeExtend([], range('e', undefined, 'a'))).toEqual(['a', 'b', 'd', 'e'])
  })

  test('puts the new range in place of the last one, so moving back lets go of what it passed', () => {
    expect(rangeExtend(['a', 'b', 'd'], range('a', 'd', 'b'))).toEqual(['a', 'b'])
    expect(rangeExtend(['d', 'e'], range('d', 'e', 'b'))).toEqual(['b', 'd'])
  })

  test('keeps what was selected outside the last range', () => {
    expect(rangeExtend(['e', 'a', 'b'], range('a', 'b', 'a'))).toEqual(['e', 'a'])
  })

  test('lets go of an item in the last range that a reader cannot choose, as React Aria does', () => {
    expect(rangeExtend(['a', 'b', 'c', 'd'], range('a', 'd', 'b'))).toEqual(['a', 'b'])
  })

  test('with no anchor, or one no item has, runs from the item alone', () => {
    expect(rangeExtend([], range(undefined, undefined, 'd'))).toEqual(['d'])
    expect(rangeExtend(['a'], range('gone', 'a', 'd'))).toEqual(['a', 'd'])
  })

  test('lets go of nothing where the item the last range reached is gone', () => {
    expect(rangeExtend(['a', 'b'], range('a', 'gone', 'a'))).toBe(null)
  })

  test('is nothing where the range leaves the same items selected', () => {
    expect(rangeExtend(['a', 'b'], range('a', 'b', 'b'))).toBe(null)
    expect(rangeExtend(['b', 'a'], range('a', undefined, 'b'))).toBe(null)
  })
})
