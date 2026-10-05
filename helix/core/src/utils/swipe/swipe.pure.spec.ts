import { describe, expect, test } from 'bun:test'
import {
  edgeOffset,
  FLING,
  parseSnapPoints,
  settleSwipe,
  snapTravel,
  swipeAxis,
  swipeEdge,
  swipeStep,
  towardEdge,
} from './swipe.js'

describe('the edge a surface leaves through', () => {
  test('the end is the right edge, and the left on a right-to-left page', () => {
    expect(swipeEdge('end', false)).toBe('right')
    expect(swipeEdge('end', true)).toBe('left')
    expect(swipeEdge('start', false)).toBe('left')
    expect(swipeEdge('start', true)).toBe('right')
  })

  test('the top and the bottom do not turn with the writing direction', () => {
    expect(swipeEdge('bottom', true)).toBe('bottom')
    expect(swipeEdge('top', false)).toBe('top')
  })

  test('the axis follows the edge', () => {
    expect(swipeAxis('left')).toBe('x')
    expect(swipeAxis('bottom')).toBe('y')
  })
})

describe('distance toward an edge', () => {
  test('is positive toward it and negative away from it', () => {
    expect(towardEdge('right', 30, 5)).toBe(30)
    expect(towardEdge('left', 30, 5)).toBe(-30)
    expect(towardEdge('bottom', 5, 12)).toBe(12)
    expect(towardEdge('top', 5, 12)).toBe(-12)
  })

  test('becomes a physical offset toward the edge', () => {
    expect(edgeOffset('left', 40)).toEqual({ x: -40, y: 0 })
    expect(edgeOffset('bottom', 40)).toEqual({ x: 0, y: 40 })
  })
})

describe('snap points', () => {
  test('are read, sorted and kept between nothing and the whole', () => {
    expect(parseSnapPoints('1 0.5 0.25')).toEqual([0.25, 0.5, 1])
    expect(parseSnapPoints('0.5, 0.5, 2, 0, -1, x')).toEqual([0.5])
  })

  test('are the whole surface where nothing usable is written', () => {
    expect(parseSnapPoints('')).toEqual([1])
    expect(parseSnapPoints(undefined)).toEqual([1])
  })

  test('sit their surface the rest of the way toward the edge', () => {
    expect(snapTravel(400, 0.5)).toBe(200)
    expect(snapTravel(400, 1)).toBe(0)
  })
})

describe('where a release comes to rest', () => {
  test('a surface with one point goes once it is past halfway, and stays before', () => {
    expect(settleSwipe({ points: [1], size: 300, travel: 160, velocity: 0 })).toBe(0)
    expect(settleSwipe({ points: [1], size: 300, travel: 140, velocity: 0 })).toBe(1)
  })

  test('a fling toward the edge goes, however short', () => {
    expect(settleSwipe({ points: [1], size: 300, travel: 20, velocity: FLING })).toBe(0)
  })

  test('a fling back keeps it, however far it had gone', () => {
    expect(settleSwipe({ points: [1], size: 300, travel: 250, velocity: -FLING })).toBe(1)
  })

  test('between points, the nearest wins, and a fling moves one point on', () => {
    const points = [0.5, 1]
    expect(settleSwipe({ points, size: 400, travel: 180, velocity: 0 })).toBe(0.5)
    expect(settleSwipe({ points, size: 400, travel: 60, velocity: 0 })).toBe(1)
    expect(settleSwipe({ points, size: 400, travel: 60, velocity: FLING })).toBe(0.5)
    expect(settleSwipe({ points, size: 400, travel: 220, velocity: FLING })).toBe(0)
    expect(settleSwipe({ points, size: 400, travel: 220, velocity: -FLING })).toBe(0.5)
  })

  test('a surface with no size stays where it is', () => {
    expect(settleSwipe({ points: [0.5, 1], size: 0, travel: 10, velocity: FLING })).toBe(1)
  })
})

describe('a swipe across a row of items', () => {
  test('a drag toward the start of the line brings the next one, past a quarter of the width', () => {
    expect(swipeStep(-120, 0, 400, false)).toBe(1)
    expect(swipeStep(120, 0, 400, false)).toBe(-1)
    expect(swipeStep(-80, 0, 400, false)).toBe(0)
  })

  test('the start of the line is on the right on a right-to-left page', () => {
    expect(swipeStep(120, 0, 400, true)).toBe(1)
    expect(swipeStep(-120, 0, 400, true)).toBe(-1)
  })

  test('a fling is enough, however short', () => {
    expect(swipeStep(-20, -FLING, 400, false)).toBe(1)
    expect(swipeStep(20, FLING, 400, false)).toBe(-1)
  })
})
