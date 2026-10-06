import { describe, expect, test } from 'bun:test'
import { extremesOf } from './read-series.js'

/* Sparkline's overview and Heatmap's busiest place each looked for these. */
describe('where the highest and the lowest readings stand', () => {
  test('is the place of each', () => {
    expect(extremesOf([3, 9, 1, 4])).toEqual({ high: 1, low: 2 })
  })

  test('the first where several tie', () => {
    expect(extremesOf([5, 2, 5, 2])).toEqual({ high: 0, low: 1 })
  })

  test('passing over a blank slot, and neither for nothing', () => {
    expect(extremesOf([undefined, 4, undefined, 6])).toEqual({ high: 3, low: 1 })
    expect(extremesOf([undefined])).toEqual({})
    expect(extremesOf([])).toEqual({})
  })
})
