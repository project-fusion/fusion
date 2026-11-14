/*
 * The resize driver: how far a drag has carried a handle toward the end of
 * its axis, across, mirrored right to left, and down an axis on end.
 */
import { describe, expect, test } from '@jest/globals'
import { travelOf } from './resize'

describe('a resizing drag', () => {
  test('travels across a horizontal axis, toward the start on a right-to-left page', () => {
    const moved = { translationX: 30, translationY: -8 }
    expect(travelOf(moved, { rtl: false, vertical: false })).toBe(30)
    expect(travelOf(moved, { rtl: true, vertical: false })).toBe(-30)
  })

  test('travels down an axis on end, whatever the page reads', () => {
    expect(travelOf({ translationX: 12, translationY: 40 }, { rtl: true, vertical: true })).toBe(40)
  })
})
