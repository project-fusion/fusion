/**
 * Where an isometric diagram puts each note, link, and group, as SVG path
 * data, seen from a camera that can turn and tilt. Pure, so the arithmetic a
 * picture hides is held by a spec: a solid painted in the wrong order is
 * covered by the one it should cover, and a face turned away is drawn over
 * the faces in front of it.
 *
 * **The floor is measured in cells.** A note at `x: 2, y: 1` stands two cells
 * across and one back, and a solid's height is in the same unit. From the
 * isometric camera, across runs down to the right on the page and back runs
 * up to the right, as a plan is seen from its front left corner.
 */

/** A point on the page, in cells. */
export interface Point {
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
  at(x: number, y: number, z?: number): Point
  /** How near the camera a place on the floor stands: the larger, the nearer. */
  depth(x: number, y: number): number
  /** The place on the floor drawn at a point on the page. */
  floorAt(point: Point): Point
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

/** The solids a note can be drawn as, one for each of the frame's shapes. */
export type Solid = 'block' | 'cylinder' | 'pyramid'

/** A note's shape, as the frame names it, and the solid that stands for it. */
export const solidOf = (shape: string | undefined): Solid =>
  shape === 'circle' || shape === 'ring' ? 'cylinder' : shape === 'diamond' ? 'pyramid' : 'block'

/** A number written short enough for path data, and never as `-0`. */
const short = (value: number): string => String(Math.round(value * 1000) / 1000 || 0)

const path = (points: readonly Point[]): string =>
  `M${points.map((point) => `${short(point.x)} ${short(point.y)}`).join('L')}Z`

/** The outline around a set of points on the page: their convex hull. */
const hullOf = (points: readonly Point[]): Point[] => {
  const sorted = [...points].sort((one, other) => one.x - other.x || one.y - other.y)
  if (sorted.length < 3) {
    return sorted
  }
  const cross = (o: Point, a: Point, b: Point): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const half = (list: Point[]): Point[] => {
    const kept: Point[] = []
    for (const point of list) {
      while (kept.length >= 2 && cross(kept.at(-2) as Point, kept.at(-1) as Point, point) <= 0) {
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
  peak: Point
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
 * across its footprint and `height` cells tall, as the camera sees it.
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
): Drawn => {
  const half = width / 2
  const tall = Math.max(0, height)
  const on = (corner: Corner): Point => projection.at(corner[0], corner[1], corner[2])
  if (kind === 'cylinder') {
    /* The rim is a circle on the floor, which the camera draws as an
       ellipse. Its leftmost point on the page is half a turn round from the
       camera's bearing and its rightmost on it, so the near half runs from
       one to the other through the front. */
    const turn = Math.atan2(projection.across[1], projection.across[0])
    const rim = (z: number, from: number, to: number): Point[] =>
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
        ...(side ? [{ d: path([...nearTop, ...[...near].reverse()]), darken: 0.28 }] : []),
        { d: path(top), darken: 0 },
      ],
      outline: path(outline),
      peak: projection.at(x, y, tall),
    }
  }
  /* The footprint's corners, counterclockwise from the front left as seen
     from above, and the outward direction of the side over each edge. */
  const floor: Corner[] = [
    [x - half, y - half, 0],
    [x + half, y - half, 0],
    [x + half, y + half, 0],
    [x - half, y + half, 0],
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
  let peak: Point
  if (kind === 'pyramid') {
    /* No lower than it is wide, or from the isometric camera its back corner
       would stand above its apex. */
    const apex: Corner = [x, y, Math.max(tall, width)]
    corners = [...floor, apex]
    peak = on(apex)
    floor.forEach((corner, at) => {
      const next = floor[(at + 1) % 4] as Corner
      const [ox, oy] = outward[at] as Corner
      /* Leaning back over its edge: out by the apex's height, up by half the width. */
      const normal: Corner = [ox * apex[2], oy * apex[2], half]
      if (facing(normal, projection)) {
        faces.push({
          d: path([on(corner), on(next), on(apex)]),
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
            d: path([on(up(corner)), on(up(next)), on(next), on(corner)]),
            darken: darkenOf(normal, projection),
          })
        }
      })
    }
    faces.push({ d: path(floor.map(up).map(on)), darken: 0 })
  }
  const outline = hullOf(corners.map(on))
  return {
    crown: Math.min(...outline.map((point) => point.y)),
    faces,
    outline: path(outline),
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

/** A link drawn on the floor from the middle of one note's footprint to the other's. */
export const floorLine = (projection: Projection, from: Point, to: Point): string => {
  const start = projection.at(from.x, from.y)
  const end = projection.at(to.x, to.y)
  return `M${short(start.x)} ${short(start.y)}L${short(end.x)} ${short(end.y)}`
}

/**
 * A group's plate on the floor: the rectangle around its notes' cells,
 * `margin` cells wider on every side, and where its name is written.
 *
 * **The name runs along the edge nearest the camera**, left to right on the
 * page, laid on the floor: `transform` is the SVG matrix that writes text
 * there, a font size in cells, from `start`, a cell of text running `along`
 * on the page.
 */
export const plate = (
  projection: Projection,
  places: readonly Point[],
  margin: number,
): { along: Point; d: string; start: Point; transform: string } | undefined => {
  if (places.length === 0) {
    return undefined
  }
  const xs = places.map((place) => place.x)
  const ys = places.map((place) => place.y)
  const low = { x: Math.min(...xs) - margin, y: Math.min(...ys) - margin }
  const high = { x: Math.max(...xs) + margin, y: Math.max(...ys) + margin }
  const corners: Point[] = [
    { x: low.x, y: low.y },
    { x: high.x, y: low.y },
    { x: high.x, y: high.y },
    { x: low.x, y: high.y },
  ]
  const outward: Point[] = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ]
  /* The edge whose outside faces the camera most. */
  const facingOf = (normal: Point): number =>
    normal.x * projection.toward[0] + normal.y * projection.toward[1]
  const edge = [0, 1, 2, 3].reduce((best, at) =>
    facingOf(outward[at] as Point) > facingOf(outward[best] as Point) ? at : best,
  )
  const normal = outward[edge] as Point
  let [from, to] = [corners[edge] as Point, corners[(edge + 1) % 4] as Point]
  if (projection.at(to.x, to.y).x < projection.at(from.x, from.y).x) {
    ;[from, to] = [to, from]
  }
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
  const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
  const origin = projection.at(0, 0)
  const step = (direction: Point): Point => {
    const at = projection.at(direction.x, direction.y)
    return { x: at.x - origin.x, y: at.y - origin.y }
  }
  const a = step(along)
  /* Down the text is outward, toward the camera, so the name's top faces into the plate. */
  const b = step(normal)
  const start = projection.at(
    from.x + along.x * 0.15 - normal.x * 0.12,
    from.y + along.y * 0.15 - normal.y * 0.12,
  )
  return {
    along: a,
    d: path(corners.map((corner) => projection.at(corner.x, corner.y))),
    start,
    transform: `matrix(${[a.x, a.y, b.x, b.y, start.x, start.y].map(short).join(' ')})`,
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

/**
 * Places a diagram that gives no note a place, in columns along the flow of
 * its links, `spacing` cells apart.
 *
 * **A note's column is the longest run of links that leads to it**, so a
 * source stands first and everything it feeds stands after it, as a pipeline
 * or a request through a service is read. Within a column the notes sort by
 * their group, so a group's plate covers one stretch, and then by where the
 * notes leading to them stand, so links cross as little as one pass can
 * make them. A loop is cut where it would carry a note past the last column.
 */
export const layered = (
  notes: readonly { group?: string | undefined; id: string }[],
  links: readonly { source: string; target: string }[],
  spacing = 2,
): Map<string, Point> => {
  const ids = notes.map((note) => note.id)
  const known = new Set(ids)
  const into = new Map<string, string[]>(ids.map((id) => [id, []]))
  for (const { source, target } of links) {
    if (known.has(source) && known.has(target) && source !== target) {
      into.get(target)?.push(source)
    }
  }
  const column = new Map<string, number>(ids.map((id) => [id, 0]))
  /* Longest paths by relaxing every link, at most once for each note, which
     is as far as a path without a loop can reach. */
  for (let pass = 0; pass < ids.length; pass++) {
    let moved = false
    for (const id of ids) {
      for (const from of into.get(id) ?? []) {
        const next = (column.get(from) ?? 0) + 1
        if (next > (column.get(id) ?? 0) && next < ids.length) {
          column.set(id, next)
          moved = true
        }
      }
    }
    if (!moved) {
      break
    }
  }
  const groupOf = new Map(notes.map((note) => [note.id, note.group ?? '']))
  const columns: string[][] = []
  for (const id of ids) {
    const at = column.get(id) ?? 0
    columns[at] = [...(columns[at] ?? []), id]
  }
  const row = new Map<string, number>()
  const placed = new Map<string, Point>()
  columns.forEach((members = [], at) => {
    /* Where the notes leading here stand, on average; a note with none keeps its order. */
    const pull = (id: string): number => {
      const rows = (into.get(id) ?? []).flatMap((from) => {
        const one = row.get(from)
        return one === undefined ? [] : [one]
      })
      return rows.length === 0
        ? members.indexOf(id)
        : rows.reduce((sum, one) => sum + one, 0) / rows.length
    }
    const sorted = [...members].sort(
      (one, other) =>
        (groupOf.get(one) ?? '').localeCompare(groupOf.get(other) ?? '') || pull(one) - pull(other),
    )
    sorted.forEach((id, index) => {
      row.set(id, index - (sorted.length - 1) / 2)
      placed.set(id, {
        x: at * spacing,
        y: -Math.round((index - (sorted.length - 1) / 2) * spacing) || 0,
      })
    })
  })
  return placed
}
