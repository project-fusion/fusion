/*
 * Which of a Scatter Chart's points are drawn together, as arithmetic with no
 * element in it.
 *
 * Pure and beside the family's `index.ts`, because which points overlap is a
 * fact about where they are, and a spec can hold it without a page.
 */

/** A point where it is drawn, in pixels, and how wide its ring is. */
export interface Placed {
  /** Across the plot from its left edge. */
  x: number
  /** Down the plot from its top edge. */
  y: number
  /** The width of its ring, which is the most it covers. */
  width: number
}

/**
 * The points in layers that each draw as one shape: in every layer but the
 * last, no two points overlap, so each keeps its edge and two that overlap
 * stand in two layers and darken where they meet. Each point takes the first
 * layer it overlaps nothing in, and past `most` layers it takes the last. A
 * point that lands in the pixel of one the last layer holds is left out, the
 * two drawing the same. `ratio` is how many pixels of the screen one of the
 * plot's is, which is the pixel meant.
 *
 * Each layer holds the places of its points, in the order given.
 *
 * **A path draws its own overlaps once.** A series' points were an element
 * each, so two that overlapped darkened where they met and a cluster read
 * darker where it was denser. In one path they are one shape, and a cluster
 * is a blot. Layers give that back for every overlap up to `most` deep, and
 * three points at the chart's opacity of 0.8 are past what an eye can tell
 * from more.
 */
export const layersOf = (points: readonly Placed[], most: number, ratio = 1): number[][] => {
  const layers: number[][] = Array.from({ length: Math.max(most, 1) }, () => [])
  if (points.length === 0) {
    return []
  }
  let widest = 0
  for (const point of points) {
    widest = Math.max(widest, point.width)
  }
  /* A grid of cells as wide as the widest ring, for each layer but the last,
     so a point is held against the points in the cells around its own and no
     others: two points farther apart than a cell cannot overlap. */
  const cell = Math.max(widest, 1)
  const grids = Array.from({ length: layers.length - 1 }, () => new Map<number, number[]>())
  const cellOf = (x: number, y: number): number =>
    (Math.floor(x / cell) + 2) * 65_536 + Math.floor(y / cell) + 2
  /* The point's own cell first, where an overlap is likeliest, so a point
     in a crowd finds one at the first or second it measures. */
  const around = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const
  const overlaps = (grid: Map<number, number[]>, point: Placed): boolean => {
    const across = Math.floor(point.x / cell)
    const down = Math.floor(point.y / cell)
    for (const [x, y] of around) {
      for (const other of grid.get((across + x + 2) * 65_536 + down + y + 2) ?? []) {
        const near = points[other] as Placed
        const reach = (point.width + near.width) / 2
        if ((point.x - near.x) ** 2 + (point.y - near.y) ** 2 < reach * reach) {
          return true
        }
      }
    }
    return false
  }
  const last = new Set<number>()
  points.forEach((point, at) => {
    /* A point in the pixel of one the last layer holds overlaps what that one
       did, and draws the same, so it is left out before it is measured. */
    const pixel = Math.round(point.x * ratio) * 1_048_576 + Math.round(point.y * ratio)
    if (last.has(pixel)) {
      return
    }
    const free = grids.findIndex((grid) => !overlaps(grid, point))
    if (free >= 0) {
      const grid = grids[free] as Map<number, number[]>
      const key = cellOf(point.x, point.y)
      const held = grid.get(key)
      if (held) {
        held.push(at)
      } else {
        grid.set(key, [at])
      }
      layers[free]?.push(at)
      return
    }
    last.add(pixel)
    layers.at(-1)?.push(at)
  })
  return layers.filter((layer) => layer.length > 0)
}
