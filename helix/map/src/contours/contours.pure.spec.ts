import { describe, expect, test } from 'bun:test'
import {
  contourInterval,
  contoursOf,
  heightsFrom,
  joinedAcross,
  tilesCovering,
} from './contours.js'

/** A hill: a cone `top` meters high in the middle of a tile, flat at its foot. */
const hill = (size = 32, top = 100) => {
  const heights = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - size / 2, y - size / 2)
      heights[y * size + x] = Math.max(0, top - distance * 8)
    }
  }
  return { heights, size, x: 0, y: 0, z: 0 }
}

describe('contour lines', () => {
  test('a tile’s colors are read as heights in either encoding', () => {
    // Terrarium: red * 256 + green + blue / 256 - 32768, so 128, 0, 0 is sea level.
    expect([...heightsFrom([128, 100, 128, 255], 'terrarium')]).toEqual([100.5])
    // Mapbox: -10000 + (red * 65536 + green * 256 + blue) / 10.
    expect(heightsFrom([1, 134, 160, 255], 'mapbox')[0]).toBeCloseTo(0, 5)
  })

  test('a hill is ringed once at every level, each ring closed, the fifth an index line', () => {
    const lines = contoursOf(hill(), 10, 'meters')
    const levels = [...new Set(lines.map((one) => one.elevation))].sort((a, b) => a - b)
    expect(levels).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90])
    for (const level of levels) {
      const rings = lines.filter((one) => one.elevation === level)
      expect(rings).toHaveLength(1)
      const [ring] = rings
      expect(ring?.coordinates.at(0)).toEqual(ring?.coordinates.at(-1))
    }
    expect(lines.filter((one) => one.index).map((one) => one.elevation)).toEqual([50])
  })

  test('in feet, the same hill has its lines at feet', () => {
    // 150 meters, smoothed at its peak to about 141, which is 463 feet.
    const lines = contoursOf(hill(32, 150), 100, 'feet')
    expect([...new Set(lines.map((one) => one.elevation))].sort((a, b) => a - b)).toEqual([
      100, 200, 300, 400,
    ])
  })

  test('the lines are further apart as the map zooms out', () => {
    expect(contourInterval(15, 'meters')).toBeLessThan(contourInterval(12, 'meters'))
    expect(contourInterval(9, 'feet')).toBe(2000)
  })

  test('the tiles covering a stretch of the world, a row at a time', () => {
    expect(tilesCovering({ east: 179, north: 80, south: -80, west: -179 }, 1)).toEqual([
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 1 },
      { x: 0, y: 1, z: 1 },
      { x: 1, y: 1, z: 1 },
    ])
  })

  test('a line cut at a tile seam is joined back into one, whichever way its halves run', () => {
    const west = {
      coordinates: [
        [0, 0],
        [1, 0],
        [2, 0],
      ] as [number, number][],
      elevation: 100,
      index: true,
    }
    const east = {
      coordinates: [
        [4, 0],
        [3, 0],
        [2, 0],
      ] as [number, number][],
      elevation: 100,
      index: true,
    }
    const other = {
      coordinates: [
        [2, 0],
        [2, 1],
        [2, 2],
      ] as [number, number][],
      elevation: 200,
      index: false,
    }
    const joined = joinedAcross([west, east, other])
    expect(joined).toHaveLength(2)
    expect(joined[0]?.coordinates).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ])
  })

  test('two tiles traced apart meet at their seam, and their halves join into one line', () => {
    /* A slope rising to the south-east across two tiles side by side, so
       every line crosses the seam between them. */
    const size = 16
    const tileAt = (x: number) => {
      const heights = new Float32Array(size * size)
      for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
          heights[row * size + column] = (x * size + column) * 4 + row * 4
        }
      }
      return { heights, size, x, y: 0, z: 2 }
    }
    const [west, east] = [tileAt(0), tileAt(1)]
    const halves = [
      ...contoursOf(west, 20, 'meters', (dx, dy) => (dx === 1 && dy === 0 ? east : undefined)),
      ...contoursOf(east, 20, 'meters', (dx, dy) => (dx === -1 && dy === 0 ? west : undefined)),
    ]
    const joined = joinedAcross(halves)
    expect(joined.length).toBeLessThan(halves.length)
    const crossing = joined.filter((line) => line.elevation === 100)
    expect(crossing).toHaveLength(1)
  })
})
