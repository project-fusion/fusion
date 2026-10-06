import { describe, expect, test } from 'bun:test'
import { sliceLabelAt } from './slice-label.js'

/* A ring of 100 by 100 with its band's middle 40 out, starting at twelve. */
const RING = {
  center: 50,
  origin: -Math.PI / 2,
  radius: 40,
  span: 1,
  tall: 100,
  top: 0,
  width: 100,
}

const near = (place: { x: number; y: number } | undefined): [number, number] | undefined =>
  place && [Math.round(place.x * 1000) / 1000, Math.round(place.y * 1000) / 1000]

describe('where a slice label goes', () => {
  test('a half of the ring from twelve is labeled at three o’clock', () => {
    expect(near(sliceLabelAt({ fraction: 0.5, start: 0 }, RING))).toEqual([90, 50])
  })

  test('the second quarter is labeled between three and six', () => {
    const place = sliceLabelAt({ fraction: 0.25, start: 0.25 }, RING)
    expect(near(place)).toEqual(near({ x: 50 + 40 * Math.SQRT1_2, y: 50 + 40 * Math.SQRT1_2 }))
  })

  test('a slice under a twentieth takes no label', () => {
    expect(sliceLabelAt({ fraction: 0.04, start: 0 }, RING)).toBeUndefined()
  })
})
