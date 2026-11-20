import { describe, expect, test } from 'bun:test'
import { CLUSTER_MAX_ZOOM, countAbbreviated, pointsDrawn } from './clusters.js'

/** Three places a few meters apart in Austin, and one across the river. */
const PLACES = [
  { lat: 30.2672, lng: -97.7431 },
  { lat: 30.26721, lng: -97.74311 },
  { lat: 30.26719, lng: -97.74309 },
  { lat: 30.2475, lng: -97.7502 },
]

describe('pointsDrawn', () => {
  test('draws every place apart where the layer does not cluster', () => {
    expect(pointsDrawn({ points: PLACES }, 3).map((one) => one.kind)).toEqual([
      'point',
      'point',
      'point',
      'point',
    ])
  })

  test('counts the places that meet, at their middle, and keeps the one apart', () => {
    const drawn = pointsDrawn({ cluster: true, points: PLACES }, 13.6)
    const counts = drawn.filter((one) => one.kind === 'cluster')
    expect(counts).toHaveLength(1)
    const [count] = counts
    expect(count?.kind === 'cluster' && count.count).toBe(3)
    expect(count?.kind === 'cluster' && [...count.members].sort()).toEqual([0, 1, 2])
    expect(count?.place.lat).toBeCloseTo(30.2672, 4)
    expect(
      drawn.filter((one) => one.kind === 'point').map((one) => one.kind === 'point' && one.index),
    ).toEqual([3])
  })

  test('gathers everything far out, and comes apart past the deepest zoom that gathers', () => {
    const far = pointsDrawn({ cluster: true, points: PLACES }, 4)
    expect(far).toHaveLength(1)
    expect(far[0]?.kind === 'cluster' && far[0].count).toBe(4)
    const deep = pointsDrawn({ cluster: true, points: PLACES }, CLUSTER_MAX_ZOOM + 1)
    expect(deep.every((one) => one.kind === 'point')).toBe(true)
  })

  test('a count comes apart one zoom deeper than it was made, or where its one count does', () => {
    const far = pointsDrawn({ cluster: true, points: PLACES }, 4)
    const [all] = far
    expect(all?.kind === 'cluster' && all.zoom).toBeGreaterThan(4)
    /* The zoom a count names is one where it is drawn as more than itself. */
    const at = all?.kind === 'cluster' ? all.zoom : 0
    expect(pointsDrawn({ cluster: true, points: PLACES }, at).length).toBeGreaterThan(1)
  })
})

describe('countAbbreviated', () => {
  test('writes a count as MapLibre abbreviates one', () => {
    expect(countAbbreviated(999)).toBe('999')
    expect(countAbbreviated(1250)).toBe('1.3k')
    expect(countAbbreviated(12_400)).toBe('12k')
  })
})
