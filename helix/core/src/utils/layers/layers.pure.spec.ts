import { describe, expect, test } from 'bun:test'
import {
  alignmentOf,
  arrowCenter,
  arrowEdges,
  matchedInlineSize,
  measuredOf,
  placedStates,
  presentedAs,
  reachOf,
  SHEET_QUERY,
  sideOf,
} from './layers.js'

describe('a panel that may be a sheet', () => {
  test('is a sheet in a narrow window under auto, and what it asks for otherwise', () => {
    expect(SHEET_QUERY).toBe('(width < 30rem)')
    expect(presentedAs('auto', true)).toBe('sheet')
    expect(presentedAs('auto', false)).toBe('popover')
    expect(presentedAs(undefined, true)).toBe('sheet')
    expect(presentedAs('popover', true)).toBe('popover')
    expect(presentedAs('sheet', false)).toBe('sheet')
  })
})

describe('a placed panel', () => {
  test('is aligned to the end its placement names, and centered where it names none', () => {
    expect(alignmentOf('bottom-start')).toBe('start')
    expect(alignmentOf('top-end')).toBe('end')
    expect(alignmentOf('right')).toBeUndefined()
    expect(sideOf('left-end')).toBe('left')
    expect(sideOf('top-start')).toBe('top')
    expect(sideOf('right')).toBe('right')
    expect(sideOf('nowhere')).toBe('bottom')
  })

  test('is in one placed state for its side and an aligned state for its end', () => {
    expect(placedStates('top-end')).toEqual({
      'aligned-end': true,
      'aligned-start': false,
      'placed-bottom': false,
      'placed-left': false,
      'placed-right': false,
      'placed-top': true,
    })
    const centered = placedStates('left')
    expect(centered['placed-left']).toBe(true)
    expect(centered['aligned-start'] || centered['aligned-end']).toBe(false)
  })

  test('tells its rules the room left and its anchor’s width, never wider than the room', () => {
    expect(measuredOf({ height: 240.4, width: 360 }, 120)).toEqual({
      'floating-anchor-inline-size': 120,
      'floating-available-block-size': 240,
    })
    expect(measuredOf({ height: 100, width: 300 }, 420)['floating-anchor-inline-size']).toBe(300)
    expect(measuredOf({ height: 100, width: 300 }, 120, { x: 17 })).toEqual({
      'floating-anchor-inline-size': 120,
      'floating-arrow-x': 17,
      'floating-available-block-size': 100,
    })
    expect(matchedInlineSize(300, -20)).toBe(0)
  })

  test('stands its arrow half its box past the edge facing the anchor, and along it where Floating UI says', () => {
    const box = { height: 8, width: 10 }
    expect(arrowEdges('bottom-start', { x: 12 }, box)).toEqual({ left: 12, top: -4 })
    expect(arrowEdges('top', { x: 30 }, box)).toEqual({ bottom: -4, left: 30 })
    expect(arrowEdges('right-start', { y: 6 }, box)).toEqual({ left: -5, top: 6 })
    expect(arrowEdges('left', { y: 9 }, box)).toEqual({ right: -5, top: 9 })
  })

  test('tells where the arrow is centered along the axis it travels alone', () => {
    expect(arrowCenter({ x: 12 }, { height: 8, width: 10 })).toEqual({ x: 17 })
    expect(arrowCenter({ y: 6 }, { height: 8, width: 10 })).toEqual({ y: 10 })
    expect(reachOf(10)).toBeCloseTo(7.071, 3)
  })
})
