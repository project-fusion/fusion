import { describe, expect, test } from 'bun:test'
import { captionAt } from './caption.js'

/** Whether a place is inside a ring of places, as the caption search asks it. */
const within = (
  place: { lat: number; lng: number },
  ring: { lat: number; lng: number }[],
): boolean => {
  let crossed = false
  for (let at = 0, before = ring.length - 1; at < ring.length; before = at++) {
    const a = ring[at] as { lat: number; lng: number }
    const b = ring[before] as { lat: number; lng: number }
    if (
      a.lat > place.lat !== b.lat > place.lat &&
      place.lng < ((b.lng - a.lng) * (place.lat - a.lat)) / (b.lat - a.lat) + a.lng
    ) {
      crossed = !crossed
    }
  }
  return crossed
}

describe('captionAt', () => {
  test('inside a square, at its middle', () => {
    const square = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ]
    const { anchor, at } = captionAt(square, 'inside')
    expect(anchor).toBe('center')
    expect(at.lat).toBeCloseTo(0.5, 1)
    expect(at.lng).toBeCloseTo(0.5, 1)
  })

  test('inside an L, in the shape, where the middle of its corners is not', () => {
    const ell = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 3 },
      { lat: 1, lng: 3 },
      { lat: 1, lng: 1 },
      { lat: 3, lng: 1 },
      { lat: 3, lng: 0 },
    ]
    const corners = {
      lat: ell.reduce((sum, one) => sum + one.lat, 0) / ell.length,
      lng: ell.reduce((sum, one) => sum + one.lng, 0) / ell.length,
    }
    expect(within(corners, ell)).toBe(false)
    expect(within(captionAt(ell, 'inside').at, ell)).toBe(true)
  })

  test('measures far from the equator as the ground is, not as the degrees are', () => {
    /* A degree of longitude at 60 degrees north is half a degree of latitude
       long, so this box is twice as tall as it is wide on the ground, and its
       middle is still its middle. */
    const box = [
      { lat: 60, lng: 0 },
      { lat: 60, lng: 2 },
      { lat: 62, lng: 2 },
      { lat: 62, lng: 0 },
    ]
    const { at } = captionAt(box, 'inside')
    expect(at.lng).toBeCloseTo(1, 1)
    expect(at.lat).toBeCloseTo(61, 1)
  })

  test('outside, above its northernmost point, and between two that share it', () => {
    const sector = [
      { lat: 0, lng: 0 },
      { lat: 2, lng: 1 },
      { lat: 2, lng: 3 },
      { lat: 0, lng: 4 },
    ]
    expect(captionAt(sector, 'outside')).toEqual({ anchor: 'bottom', at: { lat: 2, lng: 2 } })
  })
})
