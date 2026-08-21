import { describe, expect, test } from 'bun:test'
import { extent, linear } from './scale.js'

describe('a linear scale', () => {
  test('maps the ends of the domain onto the ends of the range', () => {
    const scale = linear([0, 100], [0, 1])
    expect(scale(0)).toBe(0)
    expect(scale(100)).toBe(1)
    expect(scale(50)).toBe(0.5)
  })

  test('an inverted range is ordinary, which is how a chart draws upward', () => {
    // SVG counts down from the top, so a chart passes `[height, 0]` and a larger
    // value lands higher without the scale knowing why.
    const scale = linear([0, 10], [32, 0])
    expect(scale(0)).toBe(32)
    expect(scale(10)).toBe(0)
    expect(scale(5)).toBe(16)
  })

  test('a value outside the domain runs past the range, rather than clamping', () => {
    // Clamping is a decision about the drawing and belongs to whatever is
    // drawing. A scale that silently folded outliers onto the edge would make
    // an out-of-range point indistinguishable from one exactly at the limit.
    const scale = linear([0, 10], [0, 100])
    expect(scale(15)).toBe(150)
    expect(scale(-5)).toBe(-50)
  })

  test('a flat domain lands in the middle of the range instead of on NaN', () => {
    /* Every value equal makes the domain zero wide and the obvious arithmetic
       divides by it. A `NaN` coordinate is not an error in SVG, it is a path
       that draws nothing, so a flat series would have come out as a missing
       chart rather than as a flat line. */
    const scale = linear([7, 7], [32, 0])
    expect(scale(7)).toBe(16)
    expect(scale(9)).toBe(16)
  })

  test('extent is the pair a domain is usually built from', () => {
    expect(extent([3, 9, 1, 7])).toEqual([1, 9])
    expect(extent([4])).toEqual([4, 4])
  })
})
