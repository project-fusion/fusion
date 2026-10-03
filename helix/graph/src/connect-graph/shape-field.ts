/**
 * A shape as a signed distance field: for any point in its box, how far it is
 * from the shape's edge, below zero inside and above zero outside, in the
 * box's units. **Flat when `depth` is zero**, and solid otherwise.
 *
 * One form for every shape, however it was given, so placing notes inside a
 * shape, on its surface, or at the nearest point inside it is the same work
 * in two dimensions and three.
 */
export interface ShapeField {
  /** How deep the box is, from front to back: zero for a flat shape. */
  readonly depth: number
  /** How far a point is from the shape's edge: below zero inside. `z` is ignored for a flat shape. */
  distance(x: number, y: number, z?: number): number
  /** How tall the box is. Its y points down, as an SVG's does. */
  readonly height: number
  /**
   * The surface the field was read from, where it was read from one, in the
   * box's units: corners three numbers each, and triangles three corners
   * each. A renderer draws it in place of a surface it would make from the
   * field, since it holds every detail the field's cells are too coarse for.
   */
  readonly mesh?: { corners: Float32Array; triangles: Uint32Array } | undefined
  /**
   * Which named part of the shape a point is in, where the shape has named
   * parts: the part nearest it, or undefined where it has none.
   */
  regionOf?(x: number, y: number, z?: number): string | undefined
  /** How wide the box is. */
  readonly width: number
}

/** How many cells a field has along its longer side, flat and solid. */
export const FLAT = 512
export const SOLID = 144

/** A distance far enough that nothing is nearer, for the transform's empty cells. */
const FAR = 1e20

/**
 * The squared distance from each cell to the nearest marked one, along one
 * line of cells: Felzenszwalb and Huttenlocher's lower envelope of parabolas,
 * linear in the line's length. Run along each axis in turn, it is the exact
 * Euclidean distance in any number of dimensions.
 */
const line = (values: Float64Array, count: number, out: Float64Array): void => {
  const hull = new Int32Array(count)
  const bounds = new Float64Array(count + 1)
  /* Where the parabola rooted at `at` overtakes the one rooted at `from`. */
  const crossing = (at: number, from: number): number =>
    ((values[at] as number) + at * at - ((values[from] as number) + from * from)) /
    (2 * at - 2 * from)
  let top = 0
  hull[0] = 0
  bounds[0] = -FAR
  bounds[1] = FAR
  for (let at = 1; at < count; at++) {
    let cross = crossing(at, hull[top] as number)
    while (cross <= (bounds[top] as number)) {
      top -= 1
      cross = crossing(at, hull[top] as number)
    }
    top += 1
    hull[top] = at
    bounds[top] = cross
    bounds[top + 1] = FAR
  }
  top = 0
  for (let at = 0; at < count; at++) {
    while ((bounds[top + 1] as number) < at) {
      top += 1
    }
    const from = hull[top] as number
    out[at] = (at - from) * (at - from) + (values[from] as number)
  }
}

/** The distance from every cell to the nearest marked one, in cells. */
const transform = (marked: Uint8Array, sizes: readonly [number, number, number]): Float64Array => {
  const [nx, ny, nz] = sizes
  const grid = new Float64Array(nx * ny * nz)
  for (let at = 0; at < grid.length; at++) {
    grid[at] = marked[at] ? 0 : FAR
  }
  const longest = Math.max(nx, ny, nz)
  const values = new Float64Array(longest)
  const out = new Float64Array(longest)
  const pass = (count: number, stride: number, starts: Iterable<number>): void => {
    for (const start of starts) {
      for (let step = 0; step < count; step++) {
        values[step] = grid[start + step * stride] as number
      }
      line(values, count, out)
      for (let step = 0; step < count; step++) {
        grid[start + step * stride] = out[step] as number
      }
    }
  }
  const along = function* (outer: number, inner: number, outerStride: number, innerStride: number) {
    for (let one = 0; one < outer; one++) {
      for (let two = 0; two < inner; two++) {
        yield one * outerStride + two * innerStride
      }
    }
  }
  pass(nx, 1, along(nz, ny, nx * ny, nx))
  pass(ny, nx, along(nz, nx, nx * ny, 1))
  if (nz > 1) {
    pass(nz, nx * ny, along(ny, nx, nx, 1))
  }
  for (let at = 0; at < grid.length; at++) {
    grid[at] = Math.sqrt(grid[at] as number)
  }
  return grid
}

/**
 * A field from a grid of cells marked inside, `cell` box units a cell, x
 * fastest and z slowest: the distance to the nearest outside cell, taken
 * from the distance to the nearest inside one, so the sign says which side
 * of the edge a point is on.
 */
export const fieldFromCells = (
  inside: Uint8Array,
  sizes: readonly [number, number, number],
  cell: number,
  box: { depth: number; height: number; width: number },
): ShapeField => {
  const outside = new Uint8Array(inside.length)
  for (let at = 0; at < inside.length; at++) {
    outside[at] = inside[at] ? 0 : 1
  }
  const toInside = transform(inside, sizes)
  const toOutside = transform(outside, sizes)
  const [nx, ny, nz] = sizes
  const signed = new Float32Array(inside.length)
  for (let at = 0; at < inside.length; at++) {
    /* Half a cell either way, so the edge falls between the cells it divides. */
    signed[at] = inside[at]
      ? -((toOutside[at] as number) - 0.5) * cell
      : ((toInside[at] as number) - 0.5) * cell
  }
  const read = (x: number, y: number, z: number): number =>
    signed[
      Math.min(Math.max(z, 0), nz - 1) * nx * ny +
        Math.min(Math.max(y, 0), ny - 1) * nx +
        Math.min(Math.max(x, 0), nx - 1)
    ] as number
  return {
    ...box,
    distance: (x, y, z = 0) => {
      /* Between cell centers, weighed by nearness, so the field is smooth to sample. */
      const fx = x / cell - 0.5
      const fy = y / cell - 0.5
      const fz = nz > 1 ? z / cell - 0.5 : 0
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const z0 = Math.floor(fz)
      const tx = fx - x0
      const ty = fy - y0
      const tz = fz - z0
      const plane = (layer: number): number =>
        (read(x0, y0, layer) * (1 - tx) + read(x0 + 1, y0, layer) * tx) * (1 - ty) +
        (read(x0, y0 + 1, layer) * (1 - tx) + read(x0 + 1, y0 + 1, layer) * tx) * ty
      const within = nz > 1 ? plane(z0) * (1 - tz) + plane(z0 + 1) * tz : plane(0)
      /* Past the box, the distance to the box as well, so nothing out there reads as inside. */
      const past = Math.hypot(
        Math.max(-x, x - box.width, 0),
        Math.max(-y, y - box.height, 0),
        nz > 1 ? Math.max(-z, z - box.depth, 0) : 0,
      )
      return past > 0 ? Math.max(within, 0) + past : within
    },
  }
}

/**
 * A field from a test of whether a point in the box is inside, sampled at
 * the center of each cell: flat when `depth` is zero, solid otherwise.
 */
export const fieldFromInside = (
  inside: (x: number, y: number, z: number) => boolean,
  box: { depth?: number | undefined; height: number; width: number },
  resolution = box.depth ? SOLID : FLAT,
): ShapeField => {
  const depth = box.depth ?? 0
  const cell = Math.max(box.width, box.height, depth) / resolution
  const nx = Math.max(1, Math.ceil(box.width / cell))
  const ny = Math.max(1, Math.ceil(box.height / cell))
  const nz = depth > 0 ? Math.max(1, Math.ceil(depth / cell)) : 1
  const cells = new Uint8Array(nx * ny * nz)
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        cells[z * nx * ny + y * nx + x] = inside(
          (x + 0.5) * cell,
          (y + 0.5) * cell,
          depth > 0 ? (z + 0.5) * cell : 0,
        )
          ? 1
          : 0
      }
    }
  }
  return fieldFromCells(cells, [nx, ny, nz], cell, {
    depth,
    height: box.height,
    width: box.width,
  })
}

/**
 * A flat field from an SVG path in a box `width` by `height`, its holes cut by
 * the even-odd rule. Drawn once to a canvas and read off it, which is what
 * lets a detailed outline become a field in a moment.
 */
export const fieldFromPath = (
  path: string,
  width: number,
  height: number,
  resolution = FLAT,
): ShapeField => {
  const cell = Math.max(width, height, 1) / resolution
  const nx = Math.max(1, Math.ceil(width / cell))
  const ny = Math.max(1, Math.ceil(height / cell))
  const canvas = document.createElement('canvas')
  canvas.width = nx
  canvas.height = ny
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const cells = new Uint8Array(nx * ny)
  if (context) {
    context.scale(1 / cell, 1 / cell)
    context.fill(new Path2D(path), 'evenodd')
    const alpha = context.getImageData(0, 0, nx, ny).data
    for (let at = 0; at < cells.length; at++) {
      cells[at] = (alpha[at * 4 + 3] ?? 0) > 127 ? 1 : 0
    }
  } else {
    cells.fill(1)
  }
  return fieldFromCells(cells, [nx, ny, 1], cell, { depth: 0, height, width })
}

/**
 * A solid puffed out of a flat shape, as a cushion is: as thick as `depth`
 * where the shape is widest, rounding to nothing at its edge, and cut
 * through wherever the flat shape has a hole.
 *
 * `roundness`, from 0 to 1, is how far in from the edge the rounding runs, as
 * a share of the way to the shape's middle: 1, the default, rounds the whole
 * way, as a pebble; less leaves a flat face, as a coin.
 */
export const inflate = (
  flat: ShapeField,
  { depth, roundness = 1 }: { depth: number; roundness?: number },
): ShapeField => {
  /* How far in the middle of the flat shape is: the deepest point, sampled. */
  let deepest = 0
  const probes = 128
  for (let row = 0; row < probes; row++) {
    for (let column = 0; column < probes; column++) {
      deepest = Math.max(
        deepest,
        -flat.distance(
          ((column + 0.5) / probes) * flat.width,
          ((row + 0.5) / probes) * flat.height,
        ),
      )
    }
  }
  const reach = Math.max(deepest * Math.min(Math.max(roundness, 0.01), 1), 1e-6)
  const middle = depth / 2
  return {
    depth,
    distance: (x, y, z = middle) => {
      const across = flat.distance(x, y)
      /* Half as thick as the solid is here: an ellipse's rise, from nothing at the edge. */
      const inset = Math.min(Math.max(-across, 0) / reach, 1)
      const half = middle * Math.sqrt(1 - (1 - inset) ** 2)
      return Math.max(across, Math.abs(z - middle) - half)
    },
    height: flat.height,
    width: flat.width,
  }
}
