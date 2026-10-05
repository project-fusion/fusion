import { describe, expect, test } from 'bun:test'
import { rangeAdd } from './range.js'

const shown = ['a', 'b', 'c', 'd', 'e']

describe('a range taken in with Shift and Home or End', () => {
  test('takes in every option from the highlight to the end, after what was selected', () => {
    expect(rangeAdd(['e'], shown, 2, 0)).toEqual(['e', 'a', 'b', 'c'])
    expect(rangeAdd([], shown, 1, 4)).toEqual(['b', 'c', 'd', 'e'])
  })

  test('adds only what was not selected already', () => {
    expect(rangeAdd(['b', 'd'], shown, 1, 4)).toEqual(['b', 'd', 'c', 'e'])
  })

  test('with no highlight, takes in the end alone', () => {
    expect(rangeAdd([], shown, -1, 4)).toEqual(['e'])
  })

  test('is nothing where everything in it was selected', () => {
    expect(rangeAdd(['a', 'b'], shown, 1, 0)).toBeNull()
  })
})
