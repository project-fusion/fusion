import { describe, expect, test } from 'bun:test'
import { contourInterval, contoursOf, heightsFrom, tilesCovering } from './contours.js'

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
})
