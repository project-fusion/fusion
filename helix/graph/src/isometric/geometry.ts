/**
 * Where an isometric diagram puts each note, link, and group, as SVG path
 * data, seen from a camera that can turn and tilt.
 *
 * **The projection and the solids are `helix-core`'s**, which every spatial
 * drawing shares, and are exported again here for the driver. What is here
 * is the graph's own: which solid a shape is, its links, its groups' plates,
 * and its layouts. Pure, so a spec holds the arithmetic a picture hides.
 *
 * **The floor is measured in cells.** A note at `x: 2, y: 1` stands two cells
 * across and one back, and a solid's height is in the same unit.
 */

import {
  type Camera,
  type Drawn,
  depthOrder,
  type Face,
  ISOMETRIC,
  LOWEST_TILT,
  type PagePoint as Point,
  type Projection,
  pathData as path,
  projectionOf,
  type Solid,
  shortNumber as short,
  solid,
} from '@fusion.dev/helix-core'

export {
  type Camera,
  type Drawn,
  depthOrder,
  type Face,
  ISOMETRIC,
  LOWEST_TILT,
  type Point,
  type Projection,
  projectionOf,
  type Solid,
  solid,
}

/** A note's shape, as the frame names it, and the solid that stands for it. */
export const solidOf = (shape: string | undefined): Solid =>
  shape === 'circle' || shape === 'ring' ? 'cylinder' : shape === 'diamond' ? 'pyramid' : 'block'

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
