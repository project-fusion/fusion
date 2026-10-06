import { describe, expect, test } from 'bun:test'
import { bubbleWeights, measuresOf } from './measures.js'

const NAMES = ['Rate', 'p50', 'Users']
const name = (column: number): string => NAMES[column] ?? ''

describe('measuresOf', () => {
  test('the first column is across and the rest are up, with no size', () => {
    expect(measuresOf([0, 1, 2], name, '')).toEqual({ across: 0, size: undefined, ups: [1, 2] })
  })

  test('`size-by` takes its column out of the series, by heading', () => {
    expect(measuresOf([0, 1, 2], name, 'Users')).toEqual({ across: 0, size: 2, ups: [1] })
    expect(measuresOf([0, 1, 2], name, 'users')).toEqual({ across: 0, size: 2, ups: [1] })
  })

  test('a size naming the first column moves across to the next', () => {
    expect(measuresOf([0, 1, 2], name, 'Rate')).toEqual({ across: 1, size: 0, ups: [2] })
  })

  test('a heading nothing has sizes nothing', () => {
    expect(measuresOf([0, 1, 2], name, 'Revenue')).toEqual({
      across: 0,
      size: undefined,
      ups: [1, 2],
    })
  })
})

describe('bubbleWeights', () => {
  test('by area: the square root of each share of the largest', () => {
    expect(bubbleWeights([100, 25, 0])).toEqual([1, 0.5, 0])
  })

  test('a size below zero is none, and a missing one has no weight', () => {
    expect(bubbleWeights([4, -4, undefined])).toEqual([1, 0, undefined])
  })

  test('no weight at all where nothing is above zero', () => {
    expect(bubbleWeights([0, -1])).toEqual([undefined, undefined])
    expect(bubbleWeights([])).toEqual([])
  })
})
