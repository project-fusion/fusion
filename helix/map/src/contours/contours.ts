/**
 * Contour lines from elevation tiles: the heights read out of a tile's
 * colors, smoothed, traced at every level with marching squares, joined into
 * lines, and placed on the globe.
 *
 * **Pure and synchronous**, so the tracing is checked without a renderer and
 * the driver only fetches, decodes, and hands the lines to the map.
 */

/** How an elevation tile stores heights in its colors. */
export type HeightEncoding = 'mapbox' | 'terrarium'

/** A tile's heights in meters, `size` by `size`, row by row from its north-west corner. */
export interface HeightTile {
  heights: Float32Array
  size: number
  x: number
  y: number
  z: number
}

/** A contour line: its points as `[lng, lat]`, its height, and whether it is an index line. */
export interface ContourLine {
  coordinates: [number, number][]
  elevation: number
  index: boolean
}

/** Meters in a foot. */
const FOOT = 0.3048

/** A tile's heights in meters from its pixels, as its encoding stores them. */
export const heightsFrom = (rgba: ArrayLike<number>, encoding: HeightEncoding): Float32Array => {
  const heights = new Float32Array(rgba.length / 4)
  for (let at = 0; at < heights.length; at++) {
    const red = rgba[at * 4] ?? 0
    const green = rgba[at * 4 + 1] ?? 0
    const blue = rgba[at * 4 + 2] ?? 0
    heights[at] =
      encoding === 'terrarium'
        ? red * 256 + green + blue / 256 - 32768
        : -10000 + (red * 65536 + green * 256 + blue) * 0.1
  }
  return heights
}

/**
 * The height between two contour lines at a zoom, in the unit they are
 * labeled in: close together at street level, far apart over a region, so a
 * view holds a readable number of them. Every fifth line is an index line.
 */
export const contourInterval = (zoom: number, unit: 'feet' | 'meters'): number => {
  const steps =
    unit === 'feet'
      ? [
          [15, 20],
          [14, 40],
          [13, 100],
          [12, 200],
          [11, 400],
          [10, 800],
        ]
      : [
          [15, 5],
          [14, 10],
          [13, 25],
          [12, 50],
          [11, 100],
          [10, 200],
        ]
  for (const [from, interval] of steps as [number, number][]) {
    if (zoom >= from) {
      return interval
    }
  }
  return unit === 'feet' ? 2000 : 500
}

/**
 * The tile beside another, `dx` columns east and `dy` rows south, where it
 * is known: what closes a seam, so a line crossing it is traced as one.
 */
export type NeighborOf = (dx: number, dy: number) => HeightTile | undefined

/**
 * A tile's heights with one more column and row, from the tiles to its east
 * and south where they are known, so lines meet across the seam; smoothed by
 * a three-by-three average, so a line follows the ground and not the noise
 * in the survey.
 *
 * **Smoothed from all eight neighbors.** The column two tiles share has to
 * come out the same in both, or the halves of a line cross the seam at two
 * places and cannot be joined: smoothed from the east and south alone, the
 * shared column was averaged with different pixels on each side.
 */
const extended = (
  tile: HeightTile,
  neighbor: NeighborOf,
): { grid: Float32Array; width: number } => {
  const size = tile.size
  const width = size + 1
  /* The height at a pixel of this tile's frame, from `-1` to `size + 1`,
     read from whichever tile holds it, and from this tile's own nearest
     edge where that tile is not known. */
  const heightAt = (x: number, y: number): number => {
    const dx = x < 0 ? -1 : x >= size ? 1 : 0
    const dy = y < 0 ? -1 : y >= size ? 1 : 0
    const holder = dx === 0 && dy === 0 ? tile : neighbor(dx, dy)
    if (holder) {
      return holder.heights[(y - dy * size) * size + (x - dx * size)] ?? 0
    }
    const cx = Math.min(size - 1, Math.max(0, x))
    const cy = Math.min(size - 1, Math.max(0, y))
    return tile.heights[cy * size + cx] ?? 0
  }
  const grid = new Float32Array(width * width)
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += heightAt(x + dx, y + dy)
        }
      }
      grid[y * width + x] = sum / 9
    }
  }
  return { grid, width }
}

/** A point on the globe from a place in a tile, in the tile's pixels. */
const placeOf = (tile: HeightTile, px: number, py: number): [number, number] => {
  const scale = 2 ** tile.z
  const lng = ((tile.x + (px + 0.5) / tile.size) / scale) * 360 - 180
  const n = Math.PI * (1 - (2 * (tile.y + (py + 0.5) / tile.size)) / scale)
  const lat = (Math.atan(Math.sinh(n)) * 180) / Math.PI
  return [Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]
}

/**
 * The segments marching squares draws in one cell, by which of its corners
 * are above the level, as pairs of the cell's edges: 0 top, 1 right, 2
 * bottom, 3 left. The two saddles are split by the cell's middle.
 */
const CASES: Record<number, [number, number][]> = {
  1: [[3, 2]],
  2: [[2, 1]],
  3: [[3, 1]],
  4: [[0, 1]],
  6: [[0, 2]],
  7: [[3, 0]],
  8: [[3, 0]],
  9: [[0, 2]],
  11: [[0, 1]],
  12: [[3, 1]],
  13: [[2, 1]],
  14: [[3, 2]],
}

/** Segments into lines, end to end, where one ends at another's start or end. */
const join = (segments: [number, number, number, number][]): [number, number][][] => {
  const key = (x: number, y: number): string => `${x.toFixed(4)},${y.toFixed(4)}`
  const ends = new Map<string, number[]>()
  segments.forEach(([ax, ay, bx, by], at) => {
    for (const end of [key(ax, ay), key(bx, by)]) {
      ends.set(end, [...(ends.get(end) ?? []), at])
    }
  })
  const used = new Uint8Array(segments.length)
  const lines: [number, number][][] = []
  const next = (x: number, y: number): [number, number] | undefined => {
    for (const at of ends.get(key(x, y)) ?? []) {
      if (used[at]) {
        continue
      }
      used[at] = 1
      const [ax, ay, bx, by] = segments[at] as [number, number, number, number]
      return key(ax, ay) === key(x, y) ? [bx, by] : [ax, ay]
    }
    return undefined
  }
  segments.forEach(([ax, ay, bx, by], at) => {
    if (used[at]) {
      return
    }
    used[at] = 1
    const line: [number, number][] = [
      [ax, ay],
      [bx, by],
    ]
    for (let step = next(bx, by); step; step = next(step[0], step[1])) {
      line.push(step)
    }
    for (let step = next(ax, ay); step; step = next(step[0], step[1])) {
      line.unshift(step)
    }
    lines.push(line)
  })
  return lines
}

/**
 * A line's points averaged with their neighbors, twice, and then thinned to
 * the ones that bend it by more than a fifth of a pixel. **Traced lines step
 * from pixel to pixel**, a corner at every one, and a label along a line is
 * placed only where the line turns gently under it: unsmoothed, a flat map
 * placed two of a valley's labels. A closed ring stays closed, and an open
 * line keeps its ends, which meet the next tile's.
 */
export const smoothed = (line: readonly [number, number][]): [number, number][] => {
  const [first, last] = [line[0], line.at(-1)]
  const closed = line.length > 3 && first?.[0] === last?.[0] && first?.[1] === last?.[1]
  let points = closed ? line.slice(0, -1) : [...line]
  for (let pass = 0; pass < 2; pass++) {
    points = points.map((point, at) => {
      if (!closed && (at === 0 || at === points.length - 1)) {
        return point
      }
      const before = points[(at - 1 + points.length) % points.length] as [number, number]
      const after = points[(at + 1) % points.length] as [number, number]
      return [(before[0] + point[0] * 2 + after[0]) / 4, (before[1] + point[1] * 2 + after[1]) / 4]
    })
  }
  const thinned = simplified(closed ? [...points, points[0] as [number, number]] : points, 0.2)
  return thinned
}

/** A line with the points that bend it by less than `tolerance` taken out, by Douglas and Peucker's method. */
const simplified = (line: [number, number][], tolerance: number): [number, number][] => {
  if (line.length < 3) {
    return line
  }
  const keep = new Uint8Array(line.length)
  keep[0] = 1
  keep[line.length - 1] = 1
  const stack: [number, number][] = [[0, line.length - 1]]
  while (stack.length > 0) {
    const [from, to] = stack.pop() as [number, number]
    const [ax, ay] = line[from] as [number, number]
    const [bx, by] = line[to] as [number, number]
    const length = Math.hypot(bx - ax, by - ay)
    let farthest = -1
    let distance = tolerance
    for (let at = from + 1; at < to; at++) {
      const [px, py] = line[at] as [number, number]
      const away =
        length === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / length
      if (away > distance) {
        distance = away
        farthest = at
      }
    }
    if (farthest >= 0) {
      keep[farthest] = 1
      stack.push([from, farthest], [farthest, to])
    }
  }
  return line.filter((_, at) => keep[at] === 1)
}

/**
 * A tile's contour lines, every `interval` of height in `unit`, the fifth an
 * index line, placed on the globe. `neighbor` gives the tiles around it,
 * which close its seams where they are known.
 */
export const contoursOf = (
  tile: HeightTile,
  interval: number,
  unit: 'feet' | 'meters',
  neighbor: NeighborOf = () => undefined,
): ContourLine[] => {
  const { grid, width } = extended(tile, neighbor)
  const scale = unit === 'feet' ? 1 / FOOT : 1
  const value = (x: number, y: number): number => (grid[y * width + x] ?? 0) * scale
  const byLevel = new Map<number, [number, number, number, number][]>()
  for (let y = 0; y < width - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const corners = [value(x, y), value(x + 1, y), value(x + 1, y + 1), value(x, y + 1)] as [
        number,
        number,
        number,
        number,
      ]
      const low = Math.min(...corners)
      const high = Math.max(...corners)
      for (let step = Math.floor(low / interval) + 1; step * interval <= high; step++) {
        const level = step * interval
        const [tl, tr, br, bl] = corners
        const shape =
          (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0)
        /* A saddle, split by the middle: above it, the two high corners join. */
        const middle = (tl + tr + br + bl) / 4
        const pairs: [number, number][] =
          shape === 5
            ? middle > level
              ? [
                  [3, 0],
                  [2, 1],
                ]
              : [
                  [3, 2],
                  [0, 1],
                ]
            : shape === 10
              ? middle > level
                ? [
                    [0, 1],
                    [3, 2],
                  ]
                : [
                    [3, 0],
                    [2, 1],
                  ]
              : (CASES[shape] ?? [])
        if (pairs.length === 0) {
          continue
        }
        const along = (from: number, to: number): number =>
          from === to ? 0.5 : (level - from) / (to - from)
        const edge = (side: number): [number, number] =>
          side === 0
            ? [x + along(tl, tr), y]
            : side === 1
              ? [x + 1, y + along(tr, br)]
              : side === 2
                ? [x + along(bl, br), y + 1]
                : [x, y + along(tl, bl)]
        const into = byLevel.get(level) ?? []
        for (const [from, to] of pairs) {
          const [ax, ay] = edge(from)
          const [bx, by] = edge(to)
          into.push([ax, ay, bx, by])
        }
        byLevel.set(level, into)
      }
    }
  }
  const lines: ContourLine[] = []
  for (const [level, segments] of byLevel) {
    for (const line of join(segments)) {
      if (line.length < 3) {
        continue
      }
      lines.push({
        coordinates: smoothed(line).map(([px, py]) => placeOf(tile, px, py)),
        elevation: Math.round(level),
        index: Math.round(level / interval) % 5 === 0,
      })
    }
  }
  return lines
}

/**
 * Lines from neighboring tiles joined where one ends at another's start or
 * end at the same height: a tile's edge is carried into its neighbor when it
 * is traced, so the two halves of a line meet at one point. Joined, a line
 * is long enough to hold its labels, where halves cut at every seam held few.
 */
export const joinedAcross = (lines: readonly ContourLine[]): ContourLine[] => {
  const key = ([lng, lat]: [number, number], elevation: number): string =>
    `${elevation}|${lng.toFixed(5)},${lat.toFixed(5)}`
  const ends = new Map<string, number[]>()
  lines.forEach((line, at) => {
    const [first, last] = [line.coordinates[0], line.coordinates.at(-1)]
    if (!first || !last || key(first, line.elevation) === key(last, line.elevation)) {
      return
    }
    for (const end of [key(first, line.elevation), key(last, line.elevation)]) {
      ends.set(end, [...(ends.get(end) ?? []), at])
    }
  })
  const used = new Uint8Array(lines.length)
  const next = (point: [number, number], elevation: number): [number, number][] | undefined => {
    for (const at of ends.get(key(point, elevation)) ?? []) {
      if (used[at]) {
        continue
      }
      used[at] = 1
      const coordinates = (lines[at] as ContourLine).coordinates
      const first = coordinates[0] as [number, number]
      return key(first, elevation) === key(point, elevation)
        ? coordinates.slice(1)
        : coordinates.slice(0, -1).reverse()
    }
    return undefined
  }
  const joined: ContourLine[] = []
  lines.forEach((line, at) => {
    if (used[at]) {
      return
    }
    used[at] = 1
    const coordinates = [...line.coordinates]
    for (let more = next(coordinates.at(-1) as [number, number], line.elevation); more; ) {
      coordinates.push(...more)
      more = next(coordinates.at(-1) as [number, number], line.elevation)
    }
    for (let more = next(coordinates[0] as [number, number], line.elevation); more; ) {
      coordinates.unshift(...more.reverse())
      more = next(coordinates[0] as [number, number], line.elevation)
    }
    joined.push({ ...line, coordinates })
  })
  return joined
}

/** The tiles at a zoom that cover a stretch of the world, west to east and north to south. */
export const tilesCovering = (
  bounds: { east: number; north: number; south: number; west: number },
  z: number,
): { x: number; y: number; z: number }[] => {
  const scale = 2 ** z
  const column = (lng: number): number => Math.floor(((lng + 180) / 360) * scale)
  const row = (lat: number): number => {
    const clamped = Math.max(-85.0511, Math.min(85.0511, lat))
    const sin = Math.sin((clamped * Math.PI) / 180)
    return Math.floor((0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale)
  }
  const tiles: { x: number; y: number; z: number }[] = []
  const [x0, x1] = [column(bounds.west), column(bounds.east)]
  const [y0, y1] = [row(bounds.north), row(bounds.south)]
  for (let y = Math.max(0, y0); y <= Math.min(scale - 1, y1); y++) {
    for (let x = x0; x <= x1; x++) {
      tiles.push({ x: ((x % scale) + scale) % scale, y, z })
    }
  }
  return tiles
}
