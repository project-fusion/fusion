import { fieldFromCells, type ShapeField, SOLID } from '../connect-graph/shape-field.js'

/** How far off a column's middle it is sampled, in cells. */
const NUDGE = 1e-6 * Math.PI

/** How a solid is read from triangles. */
export interface TriangleOptions {
  /** How many cells the field has along the solid's longest side. 96 by default. */
  resolution?: number | undefined
}

/**
 * A solid field from a closed surface of triangles: `positions` three
 * numbers a corner, and `index` three corners a triangle, or every three
 * corners in order where there is none. Its y points up, as a model's does,
 * and its box is the surface's own bounds, a cell of room around them.
 *
 * **Read a column of cells at a time**: each triangle marks where it crosses
 * the columns under it, and a cell is inside where an odd number of
 * crossings lie in front of it. A model of a hundred thousand triangles is
 * read in a moment, where testing each cell against each triangle would take
 * minutes. A surface with gaps is read as closed where it can be, and a gap
 * shows as a column filled or emptied through.
 */
export const shapeFromTriangles = (
  positions: ArrayLike<number>,
  index?: ArrayLike<number> | null | undefined,
  { resolution = SOLID }: TriangleOptions = {},
): ShapeField => {
  const corners = Math.floor(positions.length / 3)
  const low = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const high = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  for (let at = 0; at < corners; at++) {
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[at * 3 + axis] as number
      low[axis] = Math.min(low[axis] as number, value)
      high[axis] = Math.max(high[axis] as number, value)
    }
  }
  if (corners === 0) {
    return fieldFromCells(new Uint8Array(1), [1, 1, 1], 1, { depth: 1, height: 1, width: 1 })
  }
  const span = Math.max(
    (high[0] as number) - (low[0] as number),
    (high[1] as number) - (low[1] as number),
    (high[2] as number) - (low[2] as number),
    1e-9,
  )
  const cell = span / Math.max(resolution - 2, 1)
  /* A cell of room on every side, so the edge is inside the box. */
  const origin = low.map((value) => value - cell) as [number, number, number]
  const nx = Math.ceil(((high[0] as number) - (low[0] as number)) / cell) + 2
  const ny = Math.ceil(((high[1] as number) - (low[1] as number)) / cell) + 2
  const nz = Math.ceil(((high[2] as number) - (low[2] as number)) / cell) + 2
  /* Where each column, by x and the field's y, is crossed, along z. */
  const crossings: number[][] = Array.from({ length: nx * ny }, () => [])
  const triangles = index ? Math.floor(index.length / 3) : Math.floor(corners / 3)
  const corner = (triangle: number, which: number): [number, number, number] => {
    const at = index ? (index[triangle * 3 + which] as number) : triangle * 3 + which
    return [
      ((positions[at * 3] as number) - origin[0]) / cell,
      /* The field's y points down, as an SVG's does, and a model's up. */
      ((high[1] as number) + cell - (positions[at * 3 + 1] as number)) / cell,
      ((positions[at * 3 + 2] as number) - origin[2]) / cell,
    ]
  }
  for (let triangle = 0; triangle < triangles; triangle++) {
    const [ax, ay, az] = corner(triangle, 0)
    const [bx, by, bz] = corner(triangle, 1)
    const [cx, cy, cz] = corner(triangle, 2)
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
    if (Math.abs(area) < 1e-12) {
      continue
    }
    const left = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5))
    const right = Math.min(nx - 1, Math.floor(Math.max(ax, bx, cx) - 0.5))
    const top = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5))
    const bottom = Math.min(ny - 1, Math.floor(Math.max(ay, by, cy) - 0.5))
    for (let row = top; row <= bottom; row++) {
      for (let column = left; column <= right; column++) {
        /* A hair off each column's middle, so no column runs exactly along
           an edge two triangles share and is counted by both or neither. */
        const px = column + 0.5 + NUDGE
        const py = row + 0.5 + NUDGE * Math.SQRT2
        /* Where the column's center falls in the triangle, by its corners' shares. */
        const u = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area
        const v = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area
        const w = 1 - u - v
        if (u < 0 || v < 0 || w < 0) {
          continue
        }
        ;(crossings[row * nx + column] as number[]).push(u * az + v * bz + w * cz)
      }
    }
  }
  const cells = new Uint8Array(nx * ny * nz)
  for (let row = 0; row < ny; row++) {
    for (let column = 0; column < nx; column++) {
      const along = (crossings[row * nx + column] as number[]).sort((one, other) => one - other)
      for (let pair = 0; pair + 1 < along.length; pair += 2) {
        const from = Math.max(0, Math.ceil((along[pair] as number) - 0.5))
        const to = Math.min(nz - 1, Math.floor((along[pair + 1] as number) - 0.5))
        for (let layer = from; layer <= to; layer++) {
          cells[layer * nx * ny + row * nx + column] = 1
        }
      }
    }
  }
  return fieldFromCells(cells, [nx, ny, nz], cell, {
    depth: nz * cell,
    height: ny * cell,
    width: nx * cell,
  })
}
