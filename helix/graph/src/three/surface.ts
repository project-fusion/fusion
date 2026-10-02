import type { ShapeField } from '../connect-graph/shape-field.js'

/** How many cells the surface is read in along the shape's longest side. */
const CELLS = 72

/**
 * The surface of a solid field where its distance is `at`, as triangles:
 * corners three numbers each in the field's box, and triangles three corners
 * each. Surface nets: a corner in each cell the surface passes through, at
 * the middle of where it crosses the cell's edges, and two triangles across
 * each edge it crosses. Smooth enough to hide what is behind a shape, and
 * made in a moment.
 */
export const surfaceOf = (
  field: ShapeField,
  at = 0,
): { corners: Float32Array; triangles: Uint32Array } => {
  const { depth, height, width } = field
  const cell = Math.max(width, height, depth) / CELLS
  /* A cell of room on every side, so a shape that fills its box is closed. */
  const nx = Math.ceil(width / cell) + 3
  const ny = Math.ceil(height / cell) + 3
  const nz = Math.ceil(depth / cell) + 3
  const value = new Float32Array(nx * ny * nz)
  const spot = (x: number, y: number, z: number): number => (z * ny + y) * nx + x
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        value[spot(x, y, z)] = field.distance((x - 1) * cell, (y - 1) * cell, (z - 1) * cell) - at
      }
    }
  }
  /* A corner in each cell the surface crosses. */
  const cornerOf = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1)
  const cellSpot = (x: number, y: number, z: number): number => (z * (ny - 1) + y) * (nx - 1) + x
  const corners: number[] = []
  const edges = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ] as const
  const offsets = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ] as const
  const values = new Float32Array(8)
  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        let inside = 0
        for (let corner = 0; corner < 8; corner++) {
          const [dx, dy, dz] = offsets[corner] as readonly [number, number, number]
          const sample = value[spot(x + dx, y + dy, z + dz)] as number
          values[corner] = sample
          if (sample < 0) {
            inside += 1
          }
        }
        if (inside === 0 || inside === 8) {
          continue
        }
        let sx = 0
        let sy = 0
        let sz = 0
        let crossed = 0
        for (const [from, to] of edges) {
          const a = values[from] as number
          const b = values[to] as number
          if (a < 0 === b < 0) {
            continue
          }
          const t = a / (a - b)
          const [ax, ay, az] = offsets[from] as readonly [number, number, number]
          const [bx, by, bz] = offsets[to] as readonly [number, number, number]
          sx += ax + (bx - ax) * t
          sy += ay + (by - ay) * t
          sz += az + (bz - az) * t
          crossed += 1
        }
        cornerOf[cellSpot(x, y, z)] = corners.length / 3
        corners.push(
          (x + sx / crossed - 1) * cell,
          (y + sy / crossed - 1) * cell,
          (z + sz / crossed - 1) * cell,
        )
      }
    }
  }
  /* Two triangles across each edge of the grid the surface crosses, joining
     the corners of the four cells around it, turned to face outward. */
  const triangles: number[] = []
  const quad = (a: number, b: number, c: number, d: number, flip: boolean): void => {
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      return
    }
    if (flip) {
      triangles.push(a, c, b, a, d, c)
    } else {
      triangles.push(a, b, c, a, c, d)
    }
  }
  for (let z = 1; z < nz - 1; z++) {
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const here = (value[spot(x, y, z)] as number) < 0
        if (x < nx - 1 && here !== (value[spot(x + 1, y, z)] as number) < 0) {
          quad(
            cornerOf[cellSpot(x, y - 1, z - 1)] as number,
            cornerOf[cellSpot(x, y, z - 1)] as number,
            cornerOf[cellSpot(x, y, z)] as number,
            cornerOf[cellSpot(x, y - 1, z)] as number,
            here,
          )
        }
        if (y < ny - 1 && here !== (value[spot(x, y + 1, z)] as number) < 0) {
          quad(
            cornerOf[cellSpot(x - 1, y, z - 1)] as number,
            cornerOf[cellSpot(x - 1, y, z)] as number,
            cornerOf[cellSpot(x, y, z)] as number,
            cornerOf[cellSpot(x, y, z - 1)] as number,
            here,
          )
        }
        if (z < nz - 1 && here !== (value[spot(x, y, z + 1)] as number) < 0) {
          quad(
            cornerOf[cellSpot(x - 1, y - 1, z)] as number,
            cornerOf[cellSpot(x, y - 1, z)] as number,
            cornerOf[cellSpot(x, y, z)] as number,
            cornerOf[cellSpot(x - 1, y, z)] as number,
            here,
          )
        }
      }
    }
  }
  return { corners: new Float32Array(corners), triangles: new Uint32Array(triangles) }
}
