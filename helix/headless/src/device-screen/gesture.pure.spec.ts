import { describe, expect, test } from 'bun:test'
import { gestureOf, TAP_SLOP } from './gesture.js'

describe('a tap or a swipe', () => {
  test('a finger that stayed within the slop tapped', () => {
    expect(gestureOf(0)).toBe('tap')
    expect(gestureOf(TAP_SLOP)).toBe('tap')
  })

  test('a finger that strayed past it swiped', () => {
    expect(gestureOf(TAP_SLOP + 1)).toBe('swipe')
  })
})
