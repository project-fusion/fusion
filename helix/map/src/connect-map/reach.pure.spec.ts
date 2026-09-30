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
  test('gives one place the room it is asked to', () => {
    const { bounds } = reachOf([{ lat: 30.27, lng: -97.74 }], 0.005)
    expect(bounds.northEast.lat - bounds.southWest.lat).toBeGreaterThan(0.009)
    expect(bounds.northEast.lng - bounds.southWest.lng).toBeGreaterThan(0.009)
  })

  /* A cluster pressed is framed to come apart, which room around it undoes. */
  test('frames places a street apart as tightly as they stand unless asked for room', () => {
    const { bounds } = reachOf([
      { lat: 30.2665, lng: -97.7431 },
      { lat: 30.2681, lng: -97.7417 },
    ])
    expect(bounds.northEast.lat - bounds.southWest.lat).toBeCloseTo(0.0016, 6)
    expect(bounds.northEast.lng - bounds.southWest.lng).toBeCloseTo(0.0014, 6)
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
