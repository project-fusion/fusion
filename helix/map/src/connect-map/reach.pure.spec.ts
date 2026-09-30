import { describe, expect, test } from 'bun:test'
import { reachOf } from './connect-map.js'

/**
 * The stretch of the world `fit()` and a cluster's press frame.
 */
describe('reachOf', () => {
  test('frames seventy thousand places without spreading them into arguments', () => {
    const places = Array.from({ length: 70_000 }, (_, at) => ({
      lat: 30 + (at % 100) / 1000,
      lng: -97 - at / 1_000_000,
    }))
    const { bounds } = reachOf(places)
    expect(bounds.northEast.lat).toBeCloseTo(30.099, 3)
    expect(bounds.southWest.lng).toBeCloseTo(-97.069999, 5)
  })

  /* A box of no size is answered with a renderer's deepest zoom. */
  test('gives one place room around it', () => {
    const { bounds } = reachOf([{ lat: 30.27, lng: -97.74 }])
    expect(bounds.northEast.lat - bounds.southWest.lat).toBeGreaterThan(0.009)
    expect(bounds.northEast.lng - bounds.southWest.lng).toBeGreaterThan(0.009)
  })

  test('measures across the antimeridian the short way round', () => {
    const { bounds, middle } = reachOf([
      { lat: -17.7, lng: 179.5 },
      { lat: -17.8, lng: -179.5 },
    ])
    expect(bounds.northEast.lng - bounds.southWest.lng).toBeCloseTo(1, 5)
    expect(Math.abs(middle.lng)).toBeCloseTo(180, 5)
  })
})
