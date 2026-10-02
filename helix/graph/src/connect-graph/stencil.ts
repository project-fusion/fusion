import type { GraphPoint } from './seed.js'

/**
 * A shape the notes are fitted into once a layout settles, in a box `width`
 * by `height`, as an SVG's `viewBox="0 0 width height"` gives one: an SVG
 * path, whose holes are cut by the even-odd rule, or a test of whether a
 * point in the box is inside.
 */
export type GraphStencil =
  | { height: number; path: string; width: number }
  | { height: number; inside: (x: number, y: number) => boolean; width: number }

/** How many pixels across a path is drawn to be read, along its longer side. */
const RASTER = 1024

/** How many cells a side the grid has that measures how much of the box the shape fills. */
const PROBE = 64

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

/**
 * Whether a point in the stencil's box is inside its shape. A path is drawn
 * once to a canvas and read off it, which is what lets twenty thousand notes
 * be fitted in a moment.
 */
const insideOf = (stencil: GraphStencil): ((x: number, y: number) => boolean) => {
  if ('inside' in stencil) {
    return stencil.inside
  }
  const scale = RASTER / Math.max(stencil.width, stencil.height, 1)
  const width = Math.max(1, Math.ceil(stencil.width * scale))
  const height = Math.max(1, Math.ceil(stencil.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return () => true
  }
  context.scale(scale, scale)
  context.fill(new Path2D(stencil.path), 'evenodd')
  const alpha = context.getImageData(0, 0, width, height).data
  return (x, y) => {
    const column = Math.floor(x * scale)
    const row = Math.floor(y * scale)
    return (
      column >= 0 &&
      row >= 0 &&
      column < width &&
      row < height &&
      (alpha[(row * width + column) * 4 + 3] ?? 0) > 127
    )
  }
}

/**
 * `count` places spread evenly over the inside of a shape: a grid sized to
 * the shape's area, each place shaken within its cell so no rows show, and
 * the grid made finer until it holds enough.
 */
export const placesIn = (
  inside: (x: number, y: number) => boolean,
  width: number,
  height: number,
  count: number,
): GraphPoint[] => {
  let filled = 0
  for (let row = 0; row < PROBE; row++) {
    for (let column = 0; column < PROBE; column++) {
      if (inside(((column + 0.5) / PROBE) * width, ((row + 0.5) / PROBE) * height)) {
        filled += 1
      }
    }
  }
  if (count === 0 || filled === 0) {
    return []
  }
  const random = seeded(count)
  let step = Math.sqrt(((filled / PROBE ** 2) * width * height) / count)
  for (let tries = 0; tries < 8; tries++) {
    const places: GraphPoint[] = []
    for (let y = step / 2; y < height; y += step) {
      for (let x = step / 2; x < width; x += step) {
        const place = {
          x: x + (random() - 0.5) * step * 0.8,
          y: y + (random() - 0.5) * step * 0.8,
        }
        if (inside(place.x, place.y)) {
          places.push(place)
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
    step *= Math.sqrt(places.length / count) * 0.97 || 0.5
  }
  return []
}

/**
 * Places a layout put anywhere, moved into the stencil's shape and filling it
 * evenly. **The notes keep their order**, left to right and, within each
 * strip, top to bottom, so notes the layout put together land together, and
 * each group takes a region of the shape.
 *
 * Centered where the layout was, and as large. The stencil's y points down,
 * as an SVG's does, and the layout's up, as Sigma and cosmos.gl draw it.
 * Places the shape cannot hold, as when it has no inside, come back as they
 * were.
 */
export const fitToStencil = (
  positions: ReadonlyMap<string, GraphPoint>,
  stencil: GraphStencil,
): Map<string, GraphPoint> => {
  const notes = [...positions].map(([id, at]) => ({ at, id }))
  if (notes.length === 0) {
    return new Map()
  }
  const places = placesIn(insideOf(stencil), stencil.width, stencil.height, notes.length)
  if (places.length < notes.length) {
    return new Map(positions)
  }
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.POSITIVE_INFINITY
  let top = Number.NEGATIVE_INFINITY
  for (const { at } of notes) {
    left = Math.min(left, at.x)
    right = Math.max(right, at.x)
    bottom = Math.min(bottom, at.y)
    top = Math.max(top, at.y)
  }
  const scale = Math.max(right - left, top - bottom, 1) / Math.max(stencil.width, stencil.height)
  /* **The strips wave**: each place is sorted by where it would be if the
     shape were bent a little, so the borders between groups curve as a
     region's would, where straight strips cut them in straight lines. */
  const { height, width } = stencil
  const spots = places
    .map((place) => ({
      across: place.x + WAVE * width * Math.sin((place.y / height) * Math.PI * 3 + 1.3),
      at: {
        x: (left + right) / 2 + (place.x - width / 2) * scale,
        y: (bottom + top) / 2 - (place.y - height / 2) * scale,
      },
      down: -place.y + WAVE * height * Math.sin((place.x / width) * Math.PI * 3 + 0.4),
    }))
    .sort((one, other) => one.across - other.across)
  notes.sort((one, other) => one.at.x - other.at.x || one.at.y - other.at.y)
  /* Strips of as many notes as there are strips, matched one to one. */
  const strip = Math.ceil(Math.sqrt(notes.length))
  const fitted = new Map<string, GraphPoint>()
  for (let from = 0; from < notes.length; from += strip) {
    const ours = notes.slice(from, from + strip).sort((one, other) => one.at.y - other.at.y)
    const theirs = spots
      .slice(from, from + strip)
      .sort((one, other) => one.down - other.down)
      .map((spot) => spot.at)
    ours.forEach((note, at) => {
      fitted.set(note.id, theirs[at] as GraphPoint)
    })
  }
  return fitted
}
