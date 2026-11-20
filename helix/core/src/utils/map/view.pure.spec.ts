import { describe, expect, test } from 'bun:test'
import { aimOf, boundsOf, fitted, metersAcross, placeAt, screenOf } from './view.js'

describe('aimOf', () => {
  test('reads a place and a zoom, with the tilt and the turn after them where given', () => {
    expect(aimOf('55.95,-3.19,13')).toEqual({
      bearing: 0,
      center: { lat: 55.95, lng: -3.19 },
      pitch: 0,
      zoom: 13,
    })
    expect(aimOf('40.7,-74,15.5,60,-20')?.pitch).toBe(60)
    expect(aimOf('40.7,-74,15.5,60,-20')?.bearing).toBe(-20)
  })

  test('is nothing for words that are not a view', () => {
    expect(aimOf(undefined)).toBeUndefined()
    expect(aimOf('')).toBeUndefined()
    expect(aimOf('55.95,-3.19')).toBeUndefined()
    expect(aimOf('north,-3,12')).toBeUndefined()
  })
})

describe('boundsOf', () => {
  test('holds every place, leaving out one that is not a number', () => {
    expect(
      boundsOf([
        { lat: 1, lng: 5 },
        { lat: -2, lng: 7 },
        { lat: Number.NaN, lng: 0 },
      ]),
    ).toEqual({ northEast: { lat: 1, lng: 7 }, southWest: { lat: -2, lng: 5 } })
    expect(boundsOf([])).toBeUndefined()
  })
})

describe('fitted', () => {
  test('frames both corners inside the padding, and its middle between them', () => {
    const bounds = { northEast: { lat: 30.3, lng: -97.7 }, southWest: { lat: 30.2, lng: -97.8 } }
    const aim = fitted(bounds, 400, 300, 20)
    const view = { ...aim, height: 300, width: 400 }
    for (const corner of [bounds.northEast, bounds.southWest]) {
      const [x, y] = screenOf(view, corner) ?? [Number.NaN, Number.NaN]
      expect(x).toBeGreaterThanOrEqual(19.9)
      expect(x).toBeLessThanOrEqual(380.1)
      expect(y).toBeGreaterThanOrEqual(19.9)
      expect(y).toBeLessThanOrEqual(280.1)
    }
    expect(aim.center.lng).toBeCloseTo(-97.75, 6)
  })

  test('goes no deeper than a street for one place', () => {
    const one = { lat: 51.5, lng: -0.12 }
    expect(fitted({ northEast: one, southWest: one }, 400, 300).zoom).toBe(15)
  })
})

describe('placeAt', () => {
  test('is the middle of the view at the middle of the box, and undoes screenOf', () => {
    const view = {
      bearing: 30,
      center: { lat: 48.85, lng: 2.35 },
      height: 300,
      pitch: 20,
      width: 400,
      zoom: 12,
    }
    const middle = placeAt(view, 200, 150)
    expect(middle.lat).toBeCloseTo(48.85, 6)
    expect(middle.lng).toBeCloseTo(2.35, 6)
    const [x, y] = screenOf(view, { lat: 48.86, lng: 2.36 }) ?? [0, 0]
    const back = placeAt(view, x, y)
    expect(back.lat).toBeCloseTo(48.86, 6)
    expect(back.lng).toBeCloseTo(2.36, 6)
  })
})

describe('metersAcross', () => {
  test('doubles with each zoom, and grows toward the poles', () => {
    expect(metersAcross(100, 0, 13)).toBeCloseTo(metersAcross(100, 0, 12) * 2, 9)
    expect(metersAcross(100, 60, 12)).toBeCloseTo(metersAcross(100, 0, 12) * 2, 6)
  })
})
