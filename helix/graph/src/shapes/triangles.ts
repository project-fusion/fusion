import { fieldFromCells, type ShapeField, SOLID } from './shape-field.js'

/** How far off a column's middle it is sampled, in cells. */
const NUDGE = 1e-6 * Math.PI

/** How a solid is read from triangles. */
export interface TriangleOptions {
  /**
   * The named parts the triangles make: each part's name, and which part
   * each triangle is in, by its place in `names`. Gives the field
   * `regionOf`, the part a point is in: the part of the triangle nearest it.
   */
  regions?: { names: readonly string[]; ofTriangle: ArrayLike<number> } | undefined
  /** How many cells the field has along the solid's longest side. 144 by default. */
  resolution?: number | undefined
}

/** How many cells across the grid is that finds the triangle nearest a point. */
const NEAREST = 40

/**
 * The part a point is in: the part of the triangle whose middle is nearest
 * it, found through a grid of the middles, searched outward one shell of
 * cells at a time.
 */
const nearestPart = (
  middles: Float32Array,
  parts: ArrayLike<number>,
  names: readonly string[],
  box: { depth: number; height: number; width: number },
): ((x: number, y: number, z?: number) => string | undefined) => {
  const size = Math.max(box.width, box.height, box.depth) / NEAREST || 1
  const nx = Math.ceil(box.width / size) + 1
  const ny = Math.ceil(box.height / size) + 1
  const nz = Math.ceil(box.depth / size) + 1
  const clamp = (value: number, most: number): number => Math.min(most - 1, Math.max(0, value))
  const cellOf = (x: number, y: number, z: number): number =>
    clamp(Math.floor(x / size), nx) +
    nx * (clamp(Math.floor(y / size), ny) + ny * clamp(Math.floor(z / size), nz))
  /* Each cell's middles, in one list in cell order: a cell's run starts at
     `start[cell]` and ends where the next cell's starts. */
  const count = middles.length / 3
  const start = new Int32Array(nx * ny * nz + 1)
  const cellAt = new Int32Array(count)
  for (let at = 0; at < count; at++) {
    const cell = cellOf(
      middles[at * 3] as number,
      middles[at * 3 + 1] as number,
      middles[at * 3 + 2] as number,
    )
    cellAt[at] = cell
    start[cell + 1] = (start[cell + 1] as number) + 1
  }
  for (let cell = 0; cell < nx * ny * nz; cell++) {
    start[cell + 1] = (start[cell + 1] as number) + (start[cell] as number)
  }
  const filled = start.slice(0, -1)
  const order = new Int32Array(count)
  for (let at = 0; at < count; at++) {
    const cell = cellAt[at] as number
    order[filled[cell] as number] = at
    filled[cell] = (filled[cell] as number) + 1
  }
  const furthest = Math.max(nx, ny, nz)
  return (x, y, z = box.depth / 2) => {
    const cx = clamp(Math.floor(x / size), nx)
    const cy = clamp(Math.floor(y / size), ny)
    const cz = clamp(Math.floor(z / size), nz)
    let best = -1
    let nearest = Number.POSITIVE_INFINITY
    const search = (ix: number, iy: number, iz: number): void => {
      if (ix < 0 || iy < 0 || iz < 0 || ix >= nx || iy >= ny || iz >= nz) {
        return
      }
      const cell = ix + nx * (iy + ny * iz)
      for (let at = start[cell] as number; at < (start[cell + 1] as number); at++) {
        const one = order[at] as number
        const far =
          ((middles[one * 3] as number) - x) ** 2 +
          ((middles[one * 3 + 1] as number) - y) ** 2 +
          ((middles[one * 3 + 2] as number) - z) ** 2
        if (far < nearest) {
          nearest = far
          best = one
        }
      }
    }
    for (let ring = 0; ring <= furthest; ring++) {
      /* Only the cells on this shell: whole faces at its front and back, and
         each slice between only its rim. */
      for (let dz = -ring; dz <= ring; dz++) {
        const face = Math.abs(dz) === ring
        for (let dy = -ring; dy <= ring; dy++) {
          const edge = face || Math.abs(dy) === ring
          for (let dx = -ring; dx <= ring; dx += edge || ring === 0 ? 1 : 2 * ring) {
            search(cx + dx, cy + dy, cz + dz)
          }
        }
      }
      /* Nothing in a further shell can be nearer than one found a shell in. */
      if (best >= 0 && Math.sqrt(nearest) <= ring * size) {
        break
      }
    }
    return best < 0 ? undefined : names[parts[best] as number]
  }
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
  { regions, resolution = SOLID }: TriangleOptions = {},
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
  /* The surface itself, in the box's units, which a renderer can draw as it is. */
  const meshCorners = new Float32Array(corners * 3)
  for (let at = 0; at < corners; at++) {
    meshCorners[at * 3] = (positions[at * 3] as number) - origin[0]
    meshCorners[at * 3 + 1] = (high[1] as number) + cell - (positions[at * 3 + 1] as number)
    meshCorners[at * 3 + 2] = (positions[at * 3 + 2] as number) - origin[2]
  }
  const meshTriangles = index
    ? Uint32Array.from({ length: triangles * 3 }, (_, at) => index[at] as number)
    : Uint32Array.from({ length: triangles * 3 }, (_, at) => at)
  const field = fieldFromCells(cells, [nx, ny, nz], cell, {
    depth: nz * cell,
    height: ny * cell,
    width: nx * cell,
  })
  let regionOf: ((x: number, y: number, z?: number) => string | undefined) | undefined
  if (regions && regions.names.length > 0) {
    const middles = new Float32Array(triangles * 3)
    for (let triangle = 0; triangle < triangles; triangle++) {
      for (let which = 0; which < 3; which++) {
        const at = corner(triangle, which)
        middles[triangle * 3] = (middles[triangle * 3] as number) + (at[0] * cell) / 3
        middles[triangle * 3 + 1] = (middles[triangle * 3 + 1] as number) + (at[1] * cell) / 3
        middles[triangle * 3 + 2] = (middles[triangle * 3 + 2] as number) + (at[2] * cell) / 3
      }
    }
    regionOf = nearestPart(middles, regions.ofTriangle, regions.names, field)
  }
  return {
    ...field,
    distance: field.distance,
    mesh: { corners: meshCorners, triangles: meshTriangles },
    ...(regionOf ? { regionOf } : {}),
  }
}
