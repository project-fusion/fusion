import type { GraphPoint } from './seed.js'
import { fieldFromInside, fieldFromPath, type ShapeField } from './shape-field.js'
import { surfaceWeb } from './surface-web.js'

/**
 * A shape the notes are drawn in. **Any shape field**, flat or solid, such as
 * `inflate` makes; or, flat, an SVG path in a box `width` by `height`, as an
 * SVG's `viewBox="0 0 width height"` gives one, whose holes are cut by the
 * even-odd rule; or a test of whether a point in that box is inside.
 */
export type GraphStencil = (
  | ShapeField
  | { height: number; path: string; width: number }
  | { height: number; inside: (x: number, y: number) => boolean; width: number }
) & {
  /**
   * Where in the shape the notes go: `fill`, all through it, which unset is;
   * or `surface`, a thin shell just inside its edge, which is how a solid
   * reads as the thing it is shaped like.
   */
  place?: 'fill' | 'surface' | undefined
  /** How thick the surface's shell is, as a share of the shape's size. 0.04 by default. */
  shell?: number | undefined
}

/** How many cells a side the grid has that measures how much of the box the shape fills. */
const PROBE = { flat: 64, solid: 32 }

/** How thick a surface's shell is where the stencil does not say, as a share of the shape's size. */
const SHELL = 0.04

/** How far the strips the notes are matched in wave, as a share of the shape's size. */
const WAVE = 0.07

/** A small random number generator, so the same graph lands in the same places on every load. */
const seeded = (seed: number): (() => number) => {
  let state = seed >>> 0 || 1
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

/* A stencil's field, made once: a path is drawn and measured, which is not
   work to repeat for every drawing of the same graph. */
const fields = new WeakMap<object, ShapeField>()

/** The field a stencil is, or is made into. */
export const fieldOf = (stencil: GraphStencil): ShapeField => {
  if ('distance' in stencil) {
    return stencil
  }
  const made = fields.get(stencil)
  if (made) {
    return made
  }
  const field =
    'path' in stencil
      ? fieldFromPath(stencil.path, stencil.width, stencil.height)
      : fieldFromInside((x, y) => stencil.inside(x, y), stencil)
  fields.set(stencil, field)
  return field
}

/**
 * `count` places spread evenly over a shape: through all of it, or through a
 * shell just inside its edge. A grid sized to the room there is, each place
 * shaken within its cell so no rows show, and made finer until it holds
 * enough.
 */
export const placesIn = (
  field: ShapeField,
  count: number,
  { place = 'fill', shell = SHELL }: { place?: 'fill' | 'surface'; shell?: number } = {},
): GraphPoint[] => {
  const solid = field.depth > 0
  const { depth, height, width } = field
  const thickness = shell * Math.max(width, height, depth)
  const takes = (x: number, y: number, z: number): boolean => {
    const distance = field.distance(x, y, z)
    return distance < 0 && (place === 'fill' || distance > -thickness)
  }
  const probe = solid ? PROBE.solid : PROBE.flat
  let taken = 0
  for (let layer = 0; layer < (solid ? probe : 1); layer++) {
    for (let row = 0; row < probe; row++) {
      for (let column = 0; column < probe; column++) {
        if (
          takes(
            ((column + 0.5) / probe) * width,
            ((row + 0.5) / probe) * height,
            solid ? ((layer + 0.5) / probe) * depth : 0,
          )
        ) {
          taken += 1
        }
      }
    }
  }
  if (count === 0 || taken === 0) {
    return []
  }
  const random = seeded(count)
  const room = (taken / probe ** (solid ? 3 : 2)) * width * height * (solid ? depth : 1)
  let step = (room / count) ** (1 / (solid ? 3 : 2))
  for (let tries = 0; tries < 8; tries++) {
    const places: GraphPoint[] = []
    const layers = solid ? Math.ceil(depth / step) : 1
    for (let layer = 0; layer < layers; layer++) {
      for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
          const place = {
            x: x + (random() - 0.5) * step * 0.8,
            y: y + (random() - 0.5) * step * 0.8,
            ...(solid ? { z: (layer + 0.5 + (random() - 0.5) * 0.8) * step } : {}),
          }
          if (takes(place.x, place.y, place.z ?? 0)) {
            places.push(place)
          }
        }
      }
    }
    if (places.length >= count) {
      /* Thinned to the count at random, so the places left over are spread
         over the whole shape and not taken from one edge. */
      for (let at = places.length - 1; at > 0; at--) {
        const other = Math.floor(random() * (at + 1))
        ;[places[at], places[other]] = [places[other] as GraphPoint, places[at] as GraphPoint]
      }
      return places.slice(0, count)
    }
    step *= (places.length / count) ** (1 / (solid ? 3 : 2)) * 0.97 || 0.5
  }
  return []
}

/**
 * Items put in an order that keeps near things near: sorted by the first
 * key, cut into slices, each slice sorted by the next key, and so on. Two
 * lists as long as each other, ordered this way, pair what lies at the same
 * place in each.
 */
const nested = <T>(items: T[], keys: ((item: T) => number)[]): T[] => {
  const [key, ...rest] = keys
  if (!key) {
    return items
  }
  const sorted = [...items].sort((one, other) => key(one) - key(other))
  if (rest.length === 0) {
    return sorted
  }
  const slice = Math.ceil(items.length ** (rest.length / keys.length))
  const out: T[] = []
  for (let from = 0; from < sorted.length; from += slice) {
    out.push(...nested(sorted.slice(from, from + slice), rest))
  }
  return out
}

/**
 * Places a layout or an arrangement put anywhere, moved into the stencil's
 * shape and spread evenly over it. **The notes keep their order**, left to
 * right, top to bottom, and front to back in a solid, so notes put together
 * land together, and each group takes a region of the shape.
 *
 * Centered where the places were, and as large. The stencil's y points down,
 * as an SVG's does, and the places' up, as Sigma, cosmos.gl and three.js draw
 * them. Places the shape cannot hold, as when it has no inside, come back as
 * they were.
 */
export const fitToStencil = (
  positions: ReadonlyMap<string, GraphPoint>,
  stencil: GraphStencil,
): Map<string, GraphPoint> => fitInStencil(positions, stencil).positions

/**
 * Where a stencil's box was put, in the places' units: its middle, and how
 * many of the places' units one of the box's is. A point in the box at `x`,
 * `y` and `z` is at `middle.x + (x - width / 2) * scale`,
 * `middle.y - (y - height / 2) * scale` and `middle.z + (z - depth / 2) * scale`.
 */
export interface StencilFrame {
  field: ShapeField
  middle: { x: number; y: number; z: number }
  /** How many of the places' units one of the box's is. */
  scale: number
  /** How thick the shell the notes were placed in is, in the box's units: none where they fill the shape. */
  shell: number
}

/** `fitToStencil`, saying where it put the stencil's box as well, where it fitted the places at all. */
export const fitInStencil = (
  positions: ReadonlyMap<string, GraphPoint>,
  stencil: GraphStencil,
  {
    clustersOf,
  }: {
    /**
     * The clusters a note is in, broadest first, such as its group and then
     * its hub. Each cluster is given a piece of a solid of its own, as many
     * places as it has notes, so no cluster is cut in two.
     */
    clustersOf?: ((id: string) => readonly string[]) | undefined
  } = {},
): { frame?: StencilFrame | undefined; positions: Map<string, GraphPoint> } => {
  const notes = [...positions].map(([id, at]) => ({ at, id }))
  if (notes.length === 0) {
    return { positions: new Map() }
  }
  const field = fieldOf(stencil)
  const places = placesIn(field, notes.length, {
    place: stencil.place ?? 'fill',
    shell: stencil.shell ?? SHELL,
  })
  if (places.length < notes.length) {
    return { positions: new Map(positions) }
  }
  const solid = field.depth > 0
  const thickness =
    (stencil.place ?? 'fill') === 'surface'
      ? (stencil.shell ?? SHELL) * Math.max(field.width, field.height, field.depth)
      : 0
  const low = {
    x: Number.POSITIVE_INFINITY,
    y: Number.POSITIVE_INFINITY,
    z: Number.POSITIVE_INFINITY,
  }
  const high = {
    x: Number.NEGATIVE_INFINITY,
    y: Number.NEGATIVE_INFINITY,
    z: Number.NEGATIVE_INFINITY,
  }
  for (const { at } of notes) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const value = at[axis] ?? 0
      low[axis] = Math.min(low[axis], value)
      high[axis] = Math.max(high[axis], value)
    }
  }
  const { depth, height, width } = field
  const scale =
    Math.max(high.x - low.x, high.y - low.y, solid ? high.z - low.z : 0, 1) /
    Math.max(width, height, depth)
  const middle = { x: (low.x + high.x) / 2, y: (low.y + high.y) / 2, z: (low.z + high.z) / 2 }
  /* **The slices wave**: each place is sorted by where it would be if the
     shape were bent a little, so the borders between groups curve as a
     region's would, where straight slices cut them in straight lines. */
  const spots = places.map((place) => {
    const z = place.z ?? depth / 2
    return {
      across: place.x + WAVE * width * Math.sin((place.y / height) * Math.PI * 3 + 1.3),
      at: {
        x: middle.x + (place.x - width / 2) * scale,
        y: middle.y - (place.y - height / 2) * scale,
        ...(solid ? { z: middle.z + (z - depth / 2) * scale } : {}),
      },
      down: -place.y + WAVE * height * Math.sin((place.x / width) * Math.PI * 3 + 0.4),
    }
  })
  const fitted = new Map<string, GraphPoint>()
  /* **A solid is matched by halves**: the notes split in two across their
     widest spread, the places split in two across theirs, each half matched
     to its half, and so on down to one. Every group, and every hub's fan
     within it, lands as one piece of the shape, where matching across, down
     and deep in slices drew a group as a band all the way round.

     **On a surface, the halves are of directions**, which way each lies
     from the middle: half of a shell's places by position can be its front
     and its back at once, so a group split there landed on both, where half
     of them by direction is one side of the shell. */
  if (solid) {
    const widest = (points: readonly GraphPoint[]): 'x' | 'y' | 'z' => {
      let best: 'x' | 'y' | 'z' = 'x'
      let spread = Number.NEGATIVE_INFINITY
      for (const axis of ['x', 'y', 'z'] as const) {
        let low = Number.POSITIVE_INFINITY
        let high = Number.NEGATIVE_INFINITY
        for (const point of points) {
          const value = point[axis] ?? 0
          low = Math.min(low, value)
          high = Math.max(high, value)
        }
        if (high - low > spread) {
          spread = high - low
          best = axis
        }
      }
      return best
    }
    /* **On a surface, the places are halved across it**, which keeps each
       half one piece of it, whatever the shape: a knot's tube or a brain's
       lobe. Through a solid, across its widest spread. */
    const targets = spots.map((spot) => spot.at)
    const web = (stencil.place ?? 'fill') === 'surface' ? surfaceWeb(targets) : undefined
    const halveTargets = (places: number[], first: number): [number[], number[]] => {
      if (web && places.length > 2) {
        return web.halve(places, first)
      }
      const axis = widest(places.map((at) => targets[at] as GraphPoint))
      const ordered = [...places].sort(
        (one, other) =>
          ((targets[one] as GraphPoint)[axis] ?? 0) - ((targets[other] as GraphPoint)[axis] ?? 0),
      )
      return [ordered.slice(0, first), ordered.slice(first)]
    }
    type Note = (typeof notes)[number]
    const keysOf = new Map(notes.map((note) => [note.id, clustersOf?.(note.id) ?? []]))
    /* **Halved by cluster where the notes are in more than one**: the
       clusters ordered across where their notes are, and cut where the count
       comes nearest half, so the places are split at exactly that count and
       every cluster lands whole on one side. Within one cluster, the next
       level down; past the last, the notes by where they are. */
    const halve = (ours: Note[], theirs: number[], level = 0): void => {
      if (ours.length === 1) {
        fitted.set((ours[0] as Note).id, targets[theirs[0] as number] as GraphPoint)
        return
      }
      if (ours.length === 0) {
        return
      }
      const clusters = new Map<string, Note[]>()
      for (const note of ours) {
        const key = keysOf.get(note.id)?.[level]
        if (key !== undefined) {
          const list = clusters.get(key)
          if (list) {
            list.push(note)
          } else {
            clusters.set(key, [note])
          }
        }
      }
      if (clusters.size === 1) {
        halve(ours, theirs, level + 1)
        return
      }
      if (
        clusters.size > 1 &&
        [...clusters.values()].reduce((sum, list) => sum + list.length, 0) === ours.length
      ) {
        const middles = [...clusters.values()].map((list) => ({
          list,
          middle: {
            x: list.reduce((sum, note) => sum + note.at.x, 0) / list.length,
            y: list.reduce((sum, note) => sum + note.at.y, 0) / list.length,
            z: list.reduce((sum, note) => sum + (note.at.z ?? 0), 0) / list.length,
          },
        }))
        const axis = widest(middles.map((one) => one.middle))
        middles.sort((one, other) => one.middle[axis] - other.middle[axis])
        let cut = 1
        let count = 0
        let best = Number.POSITIVE_INFINITY
        let first = 0
        for (let at = 0; at < middles.length - 1; at++) {
          count += (middles[at] as (typeof middles)[number]).list.length
          if (Math.abs(count - ours.length / 2) < best) {
            best = Math.abs(count - ours.length / 2)
            cut = at + 1
            first = count
          }
        }
        const [near, rest] = halveTargets(theirs, first)
        halve(
          middles.slice(0, cut).flatMap((one) => one.list),
          near,
          level,
        )
        halve(
          middles.slice(cut).flatMap((one) => one.list),
          rest,
          level,
        )
        return
      }
      const mine = widest(ours.map((note) => note.at))
      ours.sort((one, other) => (one.at[mine] ?? 0) - (other.at[mine] ?? 0))
      const half = Math.floor(ours.length / 2)
      const [near, rest] = halveTargets(theirs, half)
      halve(ours.slice(0, half), near, level)
      halve(ours.slice(half), rest, level)
    }
    halve(
      [...notes],
      targets.map((_, at) => at),
    )
    return { frame: { field, middle, scale, shell: thickness }, positions: fitted }
  }
  const ours = nested(notes, [(note) => note.at.x, (note) => note.at.y])
  const theirs = nested(spots, [(spot) => spot.across, (spot) => spot.down])
  ours.forEach((note, at) => {
    fitted.set(note.id, (theirs[at] as (typeof spots)[number]).at)
  })
  return { frame: { field, middle, scale, shell: thickness }, positions: fitted }
}
