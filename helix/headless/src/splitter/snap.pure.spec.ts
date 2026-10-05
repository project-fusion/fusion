import { describe, expect, test } from 'bun:test'
import { snapTo } from './snap.js'

describe('snapTo', () => {
  test('lands on the nearest point within the threshold', () => {
    expect(snapTo(48, [25, 50, 75], 3)).toBe(50)
    expect(snapTo(27, [25, 50, 75], 3)).toBe(25)
  })

  test('stays where the pointer is beyond every threshold', () => {
    expect(snapTo(40, [25, 50, 75], 3)).toBe(40)
    expect(snapTo(40, [], 3)).toBe(40)
  })

  test('takes the nearer of two points in reach, and the first on a tie', () => {
    expect(snapTo(51, [48, 52], 5)).toBe(52)
    expect(snapTo(50, [48, 52], 5)).toBe(48)
  })
})
