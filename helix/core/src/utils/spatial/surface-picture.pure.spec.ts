import { describe, expect, test } from 'bun:test'
import { boxView, SPATIAL_VIEW } from './box.js'
import { surfaceOf } from './surface.js'
import { contoursIn, shadeOf, surfacePicture } from './surface-picture.js'

const row = (label: string, x: number, z: number, y: number | undefined) => ({
  cells: [
    { name: 'Hour', text: String(x), value: x },
    { name: 'Day', text: String(z), value: z },
    { name: 'Load', text: y === undefined ? '' : String(y), value: y },
  ],
  label,
})

/* A grid of three across and two deep, its far corner missing. */
const field = surfaceOf(
  [
    row('a', 0, 0, 10),
    row('b', 1, 0, 30),
    row('c', 2, 0, 20),
    row('d', 0, 1, 40),
    row('e', 1, 1, 50),
    row('f', 2, 1, undefined),
  ],
  [0, 1, 2],
)

const view = boxView(field.axes, SPATIAL_VIEW, [], false, 1, 'en')

describe('a surface as a drawing lays it out', () => {
  test('a square with four readings is a face, one with three a triangle, and the faces go back to front', () => {
    const { faces, places } = surfacePicture(field, view)
    expect(faces.map((face) => face.corners.length).sort()).toEqual([3, 4])
    expect(faces[0]?.depth).toBeLessThanOrEqual(faces[1]?.depth ?? 0)
    /* Five readings stand on the page; the open place has none. */
    expect(places.map((place) => place.index)).toEqual([0, 1, 2, 3, 4])
    for (const face of faces) {
      expect(face.level).toBeGreaterThanOrEqual(0)
      expect(face.level).toBeLessThanOrEqual(1)
      expect(face.d.startsWith('M')).toBe(true)
    }
  })

  test('a face turned to the light takes no shade, and one turned away the most', () => {
    expect(
      shadeOf([
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 1],
      ]),
    ).toBeCloseTo(0.3 * (1 - 1 / Math.hypot(-0.45, 1, 0.35)), 6)
    expect(
      shadeOf([
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]),
    ).toBeLessThanOrEqual(0.3)
  })

  test('a contour that crosses a square is drawn after it, at its height between the ends', () => {
    const level = field.contours.find((contour) => contour.segments.length > 0)
    const square = level?.squares[0] ?? 0
    const drawn = contoursIn(field, square, view.on)
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn[0]?.d).toMatch(/^M[-\d.]+ [-\d.]+L/)
    expect(drawn[0]?.level).toBeGreaterThan(0)
    expect(drawn[0]?.level).toBeLessThan(1)
  })
})
