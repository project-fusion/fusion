/**
 * Where an isometric diagram puts each note, link, and group, as SVG path
 * data. Pure, so the arithmetic a picture hides is held by a spec: a solid
 * painted in the wrong order is covered by the one it should cover.
 *
 * **The floor is measured in cells.** A note at `x: 2, y: 1` stands two cells
 * across and one back, and a solid's height is in the same unit. Across runs
 * down to the right on the page, and back runs up to the right, as a plan is
 * seen from its front left corner.
 */

/** How far across the page one step along either floor axis goes: the cosine of 30 degrees. */
export const ACROSS = Math.sqrt(3) / 2

/** A point on the page, in cells. */
export interface Point {
  x: number
  y: number
}

/** The solids a note can be drawn as, one for each of the frame's shapes. */
export type Solid = 'block' | 'cylinder' | 'pyramid'

/** A note's shape, as the frame names it, and the solid that stands for it. */
export const solidOf = (shape: string | undefined): Solid =>
  shape === 'circle' || shape === 'ring' ? 'cylinder' : shape === 'diamond' ? 'pyramid' : 'block'

/** A place on the floor and a height, on the page. */
export const project = (x: number, y: number, z = 0): Point => ({
  x: (x + y) * ACROSS,
  y: (x - y) / 2 - z,
})

/** A number written short enough for path data, and never as `-0`. */
const short = (value: number): string => String(Math.round(value * 1000) / 1000 || 0)

const path = (points: readonly Point[]): string =>
  `M${points.map((point) => `${short(point.x)} ${short(point.y)}`).join('L')}Z`

/** One note drawn as a solid: the faces a viewer sees, as path data, back to front. */
export interface Drawn {
  /** How high the solid reaches on the page: the top of its outline, which its name is drawn above. */
  crown: number
  /** The faces, the darker side first and the top last, each with the light it takes. */
  faces: { d: string; light: 'left' | 'right' | 'top' }[]
  /** The middle of the solid's top, which its name is centered over. */
  peak: Point
  /** The outline of the whole solid, which a ring is drawn along. */
  outline: string
}

/** How many straight pieces a cylinder's rim is drawn in, around half of it. */
const ARC = 12

/**
 * A note as a solid, standing on the floor at `x` and `y`, `width` cells
 * across its footprint and `height` cells tall.
 *
 * **A block shows its top and two sides, a cylinder its top and its front,
 * and a pyramid its two front faces**, which are what a viewer above and in
 * front of the floor sees of each.
 */
export const solid = (kind: Solid, x: number, y: number, width: number, height: number): Drawn => {
  const half = width / 2
  const tall = Math.max(0, height)
  if (kind === 'cylinder') {
    /* The rim is a circle on the floor, which the projection draws as an
       ellipse: its points are read off the circle, so it is exact at any
       width. The front half is the near side, from the left of the ellipse
       round to its right. */
    const rim = (z: number, from: number, to: number): Point[] =>
      Array.from({ length: ARC + 1 }, (_, step) => {
        const angle = from + ((to - from) * step) / ARC
        return project(x + Math.cos(angle) * half, y + Math.sin(angle) * half, z)
      })
    /* On this floor the rim's leftmost point is five eighths of a turn round
       it, its front seven eighths, and its rightmost one eighth: the near
       half runs from the leftmost through the front, and the far half from
       the rightmost through the back. */
    const leftmost = (5 * Math.PI) / 4
    const near = rim(0, leftmost, leftmost + Math.PI)
    const nearTop = rim(tall, leftmost, leftmost + Math.PI)
    const farTop = rim(tall, leftmost - Math.PI, leftmost)
    const top = rim(tall, 0, 2 * Math.PI).slice(0, -1)
    return {
      crown: Math.min(...farTop.map((point) => point.y)),
      faces: [
        { d: path([...nearTop, ...[...near].reverse()]), light: 'right' },
        { d: path(top), light: 'top' },
      ],
      outline: path([...farTop, ...near]),
      peak: project(x, y, tall),
    }
  }
  const back = project(x - half, y + half)
  const across = project(x + half, y + half)
  const front = project(x + half, y - half)
  const left = project(x - half, y - half)
  if (kind === 'pyramid') {
    /* No lower than it is wide, or its back corner would stand above its
       apex and the faces drawn would be the ones turned away. */
    const apex = project(x, y, Math.max(tall, width))
    return {
      crown: apex.y,
      faces: [
        { d: path([left, front, apex]), light: 'left' },
        { d: path([front, across, apex]), light: 'right' },
      ],
      outline: path([left, front, across, apex]),
      peak: apex,
    }
  }
  const up = (point: Point): Point => ({ x: point.x, y: point.y - tall })
  return {
    crown: up(back).y,
    faces: [
      { d: path([up(left), up(front), front, left]), light: 'left' },
      { d: path([up(front), up(across), across, front]), light: 'right' },
      { d: path([up(back), up(across), up(front), up(left)]), light: 'top' },
    ],
    outline: path([up(back), up(across), across, front, left, up(left)]),
    peak: project(x, y, tall),
  }
}

/**
 * The order to paint notes in, back to front: by how far forward each stands
 * on the floor, and the taller first where two stand level.
 *
 * Exact for notes on whole cells, which do not overlap on the floor; two
 * notes placed inside one cell can still cross.
 */
export const depthOrder = <T extends { height: number; x: number; y: number }>(
  notes: readonly T[],
): T[] =>
  [...notes].sort((one, other) => one.x - one.y - (other.x - other.y) || other.height - one.height)

/** A link drawn on the floor from the middle of one note's footprint to the other's. */
export const floorLine = (from: Point, to: Point): string => {
  const start = project(from.x, from.y)
  const end = project(to.x, to.y)
  return `M${short(start.x)} ${short(start.y)}L${short(end.x)} ${short(end.y)}`
}

/**
 * A group's plate on the floor: the rectangle around its notes' cells,
 * `margin` cells wider on every side, and the corner its name is written by.
 */
export const plate = (
  places: readonly Point[],
  margin: number,
): { d: string; label: Point } | undefined => {
  if (places.length === 0) {
    return undefined
  }
  const xs = places.map((place) => place.x)
  const ys = places.map((place) => place.y)
  const low = { x: Math.min(...xs) - margin, y: Math.min(...ys) - margin }
  const high = { x: Math.max(...xs) + margin, y: Math.max(...ys) + margin }
  return {
    d: path([
      project(low.x, high.y),
      project(high.x, high.y),
      project(high.x, low.y),
      project(low.x, low.y),
    ]),
    /* The plate's front left edge, which no note in it covers. */
    label: project(low.x, (low.y + high.y) / 2),
  }
}

/**
 * Places each note in `unplaced` on the nearest whole cell that keeps
 * `spacing` cells from every note already placed, starting from where it was
 * seeded, so a diagram given no places is a tidy grid with each note beside
 * the ones it links to. A note the page placed keeps its place.
 */
export const snapToCells = (
  seeded: ReadonlyMap<string, Point>,
  unplaced: ReadonlySet<string>,
  spacing = 2,
): Map<string, Point> => {
  const taken: Point[] = []
  for (const [id, at] of seeded) {
    if (!unplaced.has(id)) {
      taken.push({ x: Math.round(at.x), y: Math.round(at.y) })
    }
  }
  const free = (cell: Point): boolean =>
    taken.every(
      (other) => Math.max(Math.abs(other.x - cell.x), Math.abs(other.y - cell.y)) >= spacing,
    )
  const placed = new Map<string, Point>()
  for (const id of unplaced) {
    const at = seeded.get(id) ?? { x: 0, y: 0 }
    const home = { x: Math.round(at.x), y: Math.round(at.y) }
    /* Rings of cells around home, nearest first, until one is free. A ring
       as wide as every note placed so far always has one. */
    for (let ring = 0; ; ring++) {
      const cells: Point[] = []
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) {
            cells.push({ x: home.x + dx, y: home.y + dy })
          }
        }
      }
      cells.sort(
        (one, other) =>
          Math.hypot(one.x - at.x, one.y - at.y) - Math.hypot(other.x - at.x, other.y - at.y),
      )
      const cell = cells.find(free)
      if (cell) {
        taken.push(cell)
        placed.set(id, cell)
        break
      }
    }
  }
  return placed
}
