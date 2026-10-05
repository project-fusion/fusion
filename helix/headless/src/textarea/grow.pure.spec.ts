import { describe, expect, test } from 'bun:test'
import { grownHeight } from './grow.js'

describe('a growing field', () => {
  const metrics = { around: 10, line: 20 }

  test('takes what its text needs where nothing caps it', () => {
    expect(grownHeight(300, undefined, metrics)).toEqual({ height: 300, scrolls: false })
    expect(grownHeight(300, 0, metrics)).toEqual({ height: 300, scrolls: false })
  })

  test('stops at max-rows lines and their padding, and scrolls past them', () => {
    expect(grownHeight(300, 4, metrics)).toEqual({ height: 90, scrolls: true })
    expect(grownHeight(70, 4, metrics)).toEqual({ height: 70, scrolls: false })
  })

  test('rounds a fractional line up, so the last line is never cut', () => {
    expect(grownHeight(300, 3, { around: 0, line: 18.4 })).toEqual({ height: 56, scrolls: true })
  })
})
