/**
 * Where a drawing in three dimensions stands on the page, seen from a camera
 * that can turn and tilt, with no perspective, as SVG path data. Shared by
 * every spatial drawing Helix makes in SVG: the graph's isometric diagram,
 * the spatial heatmap, and the spatial charts' own drawings.
 *
 * Pure, so the arithmetic a picture hides is held by a spec: a solid painted
 * in the wrong order is covered by the one it should cover, and a face turned
 * away is drawn over the faces in front of it.
 *
 * **The floor is measured in cells.** A place at `x: 2, y: 1` stands two
 * cells across and one back, and a height is in the same unit. From the
 * isometric camera, across runs down to the right on the page and back runs
 * up to the right, as a plan is seen from its front left corner.
 */

/** A point on the page, in cells. */
export interface PagePoint {
  x: number
  y: number
}

/**
 * Where the diagram is seen from, in degrees: `turn`, the compass bearing
 * the camera looks from, and `tilt`, its height above the floor, from a low
 * angle to 90, a plan seen straight down.
 */
export interface Camera {
  tilt: number
  turn: number
}

/**
 * The isometric camera: from the front left corner, at the height where the
 * floor's two axes and the vertical are drawn the same length, 35.26 degrees.
 */
export const ISOMETRIC: Camera = { tilt: (Math.atan(Math.SQRT1_2) * 180) / Math.PI, turn: 45 }

/** The lowest a camera may tilt, below which the floor folds to a line. */
export const LOWEST_TILT = 15

/**
 * How large a cell is drawn, so the isometric camera draws a cell as wide as
 * the cosine of 30 degrees and a cell's height as one.
 */
const SCALE = Math.sqrt(1.5)

/** A camera's view of the floor. */
export interface Projection {
  /** A place on the floor and a height, on the page. */
  at(x: number, y: number, z?: number): PagePoint
  /** How near the camera a place on the floor stands: the larger, the nearer. */
  depth(x: number, y: number): number
  /** The place on the floor drawn at a point on the page. */
  floorAt(point: PagePoint): PagePoint
  /** Toward the camera from the floor, a unit length: across, back, and up. */
  toward: readonly [number, number, number]
  /** Across the page, in floor directions: how far a step across or back goes to the right. */
  across: readonly [number, number]
}

/**
 * The view from `camera`, an orthographic one: the floor turned by `turn`
 * and seen from `tilt` above it, with no perspective, so a cell is the same
 * size wherever it stands.
 */
export const projectionOf = (camera: Camera): Projection => {
  const turn = (camera.turn * Math.PI) / 180
  const tilt = (Math.min(Math.max(camera.tilt, LOWEST_TILT), 90) * Math.PI) / 180
  const [cos, sin] = [Math.cos(turn), Math.sin(turn)]
  const [rise, fall] = [Math.sin(tilt), Math.cos(tilt)]
  return {
    across: [cos, sin],
    at: (x, y, z = 0) => ({
      x: (x * cos + y * sin) * SCALE,
      y: ((x * sin - y * cos) * rise - z * fall) * SCALE,
    }),
    depth: (x, y) => x * sin - y * cos,
    floorAt: (point) => {
      const u = point.x / SCALE
      const v = point.y / SCALE / rise
      return { x: u * cos + v * sin, y: u * sin - v * cos }
    },
    toward: [sin * fall, -cos * fall, rise],
  }
}

/** The solids a note can be drawn as, a block, a cylinder, or a pyramid. */
export type Solid = 'block' | 'cylinder' | 'pyramid'

/** A number written short enough for path data, and never as `-0`. */
export const shortNumber = (value: number): string => String(Math.round(value * 1000) / 1000 || 0)

export const pathData = (points: readonly PagePoint[]): string =>
  `M${points.map((point) => `${shortNumber(point.x)} ${shortNumber(point.y)}`).join('L')}Z`

/** The outline around a set of points on the page: their convex hull, in order round it. */
export const hullOf = (points: readonly PagePoint[]): PagePoint[] => {
  const sorted = [...points].sort((one, other) => one.x - other.x || one.y - other.y)
  if (sorted.length < 3) {
    return sorted
  }
  const cross = (o: PagePoint, a: PagePoint, b: PagePoint): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const half = (list: PagePoint[]): PagePoint[] => {
    const kept: PagePoint[] = []
    for (const point of list) {
      while (
        kept.length >= 2 &&
        cross(kept.at(-2) as PagePoint, kept.at(-1) as PagePoint, point) <= 0
      ) {
        kept.pop()
      }
      kept.push(point)
    }
    kept.pop()
    return kept
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}

/** One face of a solid, as path data, and how far it is darkened toward black. */
export interface Face {
  d: string
  /** From 0, the note's own color, as a top facing the light takes it. */
  darken: number
}

/** One note drawn as a solid: the faces the camera sees, in the order to paint them. */
export interface Drawn {
  /** How high the solid reaches on the page: the top of its outline, which its name is drawn above. */
  crown: number
  /** The faces the camera sees, the sides first and the top last. */
  faces: Face[]
  /** The outline of the whole solid, which a ring is drawn along. */
  outline: string
  /** The middle of the solid's top, which its name is centered over. */
  peak: PagePoint
}

/** A corner of a solid: across, back, and up. */
type Corner = readonly [number, number, number]

/**
 * How dark a face is, from its outward direction. **The light falls from
 * the upper left of the page**, wherever the camera turns: a top takes the
 * note's color, a side facing the left of the page is darkened a fifth, and
 * one facing its right a little over a third.
 */
const darkenOf = (normal: Corner, projection: Projection): number => {
  const [x, y, z] = normal
  const length = Math.hypot(x, y, z) || 1
  const level = Math.hypot(x, y) || 1
  const right = (x * projection.across[0] + y * projection.across[1]) / level
  return Math.max(0, 0.28 + 0.113 * right) * (1 - z / length)
}

/** Whether a face with this outward direction turns toward the camera. */
const facing = (normal: Corner, projection: Projection): boolean =>
  normal[0] * projection.toward[0] +
    normal[1] * projection.toward[1] +
    normal[2] * projection.toward[2] >
  1e-6

/** How many straight pieces a cylinder's rim is drawn in, around half of it. */
const ARC = 12

/**
 * A note as a solid, standing on the floor at `x` and `y`, `width` cells
 * across its footprint and `height` cells tall, as the camera sees it. A
 * block or a pyramid is `deep` cells back, as wide as it is deep where that
 * is not given; a cylinder is round.
 *
 * **Each face is drawn only where it turns toward the camera**, so a block
 * shows its top and the two sides that face the viewer from any turn, and a
 * plan seen from straight above shows tops alone.
 */
export const solid = (
  projection: Projection,
  kind: Solid,
  x: number,
  y: number,
  width: number,
  height: number,
  deep = width,
): Drawn => {
  const half = width / 2
  const back = deep / 2
  const tall = Math.max(0, height)
  const on = (corner: Corner): PagePoint => projection.at(corner[0], corner[1], corner[2])
  if (kind === 'cylinder') {
    /* The rim is a circle on the floor, which the camera draws as an
       ellipse. Its leftmost point on the page is half a turn round from the
       camera's bearing and its rightmost on it, so the near half runs from
       one to the other through the front. */
    const turn = Math.atan2(projection.across[1], projection.across[0])
    const rim = (z: number, from: number, to: number): PagePoint[] =>
      Array.from({ length: ARC + 1 }, (_, step) => {
        const angle = from + ((to - from) * step) / ARC
        return projection.at(x + Math.cos(angle) * half, y + Math.sin(angle) * half, z)
      })
    const near = rim(0, turn + Math.PI, turn + 2 * Math.PI)
    const nearTop = rim(tall, turn + Math.PI, turn + 2 * Math.PI)
    const farTop = rim(tall, turn, turn + Math.PI)
    const top = rim(tall, 0, 2 * Math.PI).slice(0, -1)
    const side = projection.toward[2] < 0.9999 && tall > 0
    const outline = hullOf([...farTop, ...nearTop, ...near])
    return {
      crown: Math.min(...outline.map((point) => point.y)),
      faces: [
        ...(side ? [{ d: pathData([...nearTop, ...[...near].reverse()]), darken: 0.28 }] : []),
        { d: pathData(top), darken: 0 },
      ],
      outline: pathData(outline),
      peak: projection.at(x, y, tall),
    }
  }
  /* The footprint's corners, counterclockwise from the front left as seen
     from above, and the outward direction of the side over each edge. */
  const floor: Corner[] = [
    [x - half, y - back, 0],
    [x + half, y - back, 0],
    [x + half, y + back, 0],
    [x - half, y + back, 0],
  ]
  const outward: Corner[] = [
    [0, -1, 0],
    [1, 0, 0],
    [0, 1, 0],
    [-1, 0, 0],
  ]
  /* The sides first and the top last. The faces of a solid that turn toward
     the camera never cover each other, so no other order is needed. */
  const faces: Face[] = []
  let corners: Corner[]
  let peak: PagePoint
  if (kind === 'pyramid') {
    /* No lower than it is wide, or from the isometric camera its back corner
       would stand above its apex. */
    const apex: Corner = [x, y, Math.max(tall, width, deep)]
    corners = [...floor, apex]
    peak = on(apex)
    floor.forEach((corner, at) => {
      const next = floor[(at + 1) % 4] as Corner
      const [ox, oy] = outward[at] as Corner
      /* Leaning back over its edge: out by the apex's height, up by half the
         footprint across that edge. */
      const normal: Corner = [ox * apex[2], oy * apex[2], ox === 0 ? back : half]
      if (facing(normal, projection)) {
        faces.push({
          d: pathData([on(corner), on(next), on(apex)]),
          darken: darkenOf(normal, projection),
        })
      }
    })
  } else {
    const up = (corner: Corner): Corner => [corner[0], corner[1], tall]
    corners = [...floor, ...floor.map(up)]
    peak = projection.at(x, y, tall)
    if (tall > 0) {
      floor.forEach((corner, at) => {
        const next = floor[(at + 1) % 4] as Corner
        const normal = outward[at] as Corner
        if (facing(normal, projection)) {
          faces.push({
            d: pathData([on(up(corner)), on(up(next)), on(next), on(corner)]),
            darken: darkenOf(normal, projection),
          })
        }
      })
    }
    faces.push({ d: pathData(floor.map(up).map(on)), darken: 0 })
  }
  const outline = hullOf(corners.map(on))
  return {
    crown: Math.min(...outline.map((point) => point.y)),
    faces,
    outline: pathData(outline),
    peak,
  }
}

/**
 * The order to paint notes in, back to front: by how near the camera each
 * stands on the floor, and the taller first where two stand level.
 *
 * Exact for notes on whole cells, which do not overlap on the floor; two
 * notes placed inside one cell can still cross.
 */
export const depthOrder = <T extends { height: number; x: number; y: number }>(
  projection: Projection,
  notes: readonly T[],
): T[] =>
  [...notes].sort((one, other) => {
    const nearer = projection.depth(one.x, one.y) - projection.depth(other.x, other.y)
    /* Level within a rounding error, which the sine and the cosine of 45
       degrees differ by, is level. */
    return Math.abs(nearer) > 1e-9 ? nearer : other.height - one.height
  })
