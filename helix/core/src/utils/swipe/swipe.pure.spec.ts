import { describe, expect, test } from 'bun:test'
import {
  edgeOffset,
  exitGlide,
  FLING,
  parseSnapPoints,
  resist,
  resisted,
  settleGlide,
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

describe('resistance past a bound', () => {
  test('follows at first, and gives less the further it goes', () => {
    expect(resist(0, 300)).toBe(0)
    expect(resist(-10, 300)).toBe(0)
    const near = resist(10, 300)
    const far = resist(200, 300)
    expect(near).toBeGreaterThan(5)
    expect(near).toBeLessThan(10)
    expect(far).toBeLessThan(200 * 0.55)
    expect(resist(100_000, 300)).toBeLessThan(300)
  })

  test('is the finger between the bounds, and resisted past either', () => {
    expect(resisted(40, 0, 100, 300)).toBe(40)
    expect(resisted(-40, 0, 100, 300)).toBeCloseTo(-resist(40, 300))
    expect(resisted(140, 0, 100, 300)).toBeCloseTo(100 + resist(40, 300))
  })
})

describe('the glide off the edge', () => {
  test('keeps the speed it was thrown at, where that covers the distance in time', () => {
    const glide = exitGlide(100, 400, 2, 320)
    expect(glide.duration).toBe(150)
    expect(glide.at(10)).toBeCloseTo(120)
    expect(glide.at(150)).toBeCloseTo(400)
  })

  test('let go slowly, starts at that speed and gathers pace to arrive in time', () => {
    const glide = exitGlide(100, 400, 0.2, 320)
    expect(glide.duration).toBe(320)
    // The speed at the release is the release's.
    expect(glide.at(1) - glide.at(0)).toBeCloseTo(0.2, 1)
    expect(glide.at(320)).toBeCloseTo(400)
    expect(glide.at(300) - glide.at(299)).toBeGreaterThan(1)
  })

  test('let go moving back, turns around without a jump', () => {
    const glide = exitGlide(100, 400, -0.3, 320)
    expect(glide.at(1)).toBeLessThan(100)
    expect(glide.at(320)).toBeCloseTo(400)
  })
})

/* The spring token, as the browser reads it at 48 even steps: each of its
   twelve segments in four. */
const SPRING = [
  0, 0.006, 0.025, 0.101, 0.539, 0.826, 0.976, 1.037, 1.043, 1.026, 1.006, 0.997, 1,
].flatMap((one, index, all) =>
  index === all.length - 1
    ? [one]
    : [0, 1, 2, 3].map((step) => one + (((all[index + 1] ?? 1) - one) * step) / 4),
)

/** The speed of a glide over each 16 millisecond frame of its first `frames`. */
const speeds = (glide: { at: (elapsed: number) => number }, frames: number): number[] =>
  Array.from(
    { length: frames },
    (_, frame) => (glide.at((frame + 1) * 16) - glide.at(frame * 16)) / 16,
  )

describe('the glide back to rest', () => {
  test('let go moving toward rest, keeps going with no stall and no lurch', () => {
    // 110 pixels from rest at a pixel a millisecond, on the spring.
    const glide = settleGlide(574, 684, 1, 320, SPRING)
    expect(glide.at(1) - glide.at(0)).toBeCloseTo(1, 1)
    /* The spring pulls it on a little faster and then slows it into place:
       measured 1.17, 1.39, 1.10 and 1.04 pixels a millisecond over the first
       four frames, where the curve run from its start went 0.5, 0.1 and then
       1.8. */
    const first = speeds(glide, 4)
    expect(Math.min(...first)).toBeGreaterThan(0.8)
    expect(Math.max(...first)).toBeLessThan(1.6)
    expect(glide.at(glide.duration)).toBeCloseTo(684, 0)
    expect(glide.duration).toBeLessThanOrEqual(320)
  })

  test('let go standing, starts from standing along the curve', () => {
    const glide = settleGlide(60, 0, 0, 320, SPRING)
    expect(glide.duration).toBe(320)
    expect(glide.at(80)).toBeCloseTo(60 - 60 * 0.101, 0)
    expect(glide.at(320)).toBeCloseTo(0, 5)
  })

  test('let go moving away from rest, carries on a little, then comes back', () => {
    const glide = settleGlide(60, 0, 0.8, 320, SPRING)
    // Standing on the curve, the push alone moves it at the release.
    expect(glide.at(1) - glide.at(0)).toBeCloseTo(0.8, 1)
    const furthest = Math.max(...Array.from({ length: 20 }, (_, step) => glide.at(step * 16)))
    expect(furthest).toBeGreaterThan(60)
    expect(furthest).toBeLessThan(80)
    expect(glide.at(320)).toBeCloseTo(0, 0)
  })
})
