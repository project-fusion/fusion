import type { MapPlace } from './connect-map.js'

/** Where an area's caption stands, and which part of it stands there. */
export interface CaptionSpot {
  /** `center` on the spot, or `bottom`, the caption above the spot. */
  anchor: 'bottom' | 'center'
  at: MapPlace
}

/** How many cells a side the search lays over the area, each round. */
const CELLS = 16

/** How many times the search narrows to the cell it liked best. */
const ROUNDS = 3

/** A place laid flat, near enough for an area a reader can see whole. */
interface Flat {
  x: number
  y: number
}

/** Whether a point is inside a ring, by how many edges a line to its right crosses. */
const inside = ({ x, y }: Flat, ring: readonly Flat[]): boolean => {
  let crossed = false
  for (let at = 0, before = ring.length - 1; at < ring.length; before = at++) {
    const a = ring[at] as Flat
    const b = ring[before] as Flat
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      crossed = !crossed
    }
  }
  return crossed
}

/** How far a point is from the nearest edge of a ring. */
const clearance = (point: Flat, ring: readonly Flat[]): number => {
  let least = Number.POSITIVE_INFINITY
  for (let at = 0, before = ring.length - 1; at < ring.length; before = at++) {
    const a = ring[before] as Flat
    const b = ring[at] as Flat
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = dx * dx + dy * dy
    const along =
      length === 0
        ? 0
        : Math.min(Math.max(((point.x - a.x) * dx + (point.y - a.y) * dy) / length, 0), 1)
    least = Math.min(least, Math.hypot(point.x - (a.x + along * dx), point.y - (a.y + along * dy)))
  }
  return least
}

/**
 * Where an area's caption stands.
 *
 * **Inside, at the point furthest from every edge**, where the most room is:
 * the middle of the corners lies outside an L-shaped or a crescent area, and
 * its caption read as the next area's. Found by laying a grid over the area,
 * keeping the cell with the most room round it, and laying a finer grid over
 * that, which is close enough for a caption and costs a few hundred
 * measurements an area. Measured flat, the longitude narrowed by the
 * latitude, so an area far from the equator is not judged wider than it is.
 *
 * **Outside, above its northernmost point**, clear of the shape, for an area
 * whose caption would hide what is in it: the caption stands on the spot and
 * reads above the edge.
 */
export const captionAt = (
  points: readonly MapPlace[],
  placement: 'inside' | 'outside',
): CaptionSpot => {
  if (placement === 'outside') {
    const north = Math.max(...points.map(({ lat }) => lat))
    const top = points.filter(({ lat }) => north - lat < 1e-9)
    const lng = top.reduce((sum, one) => sum + one.lng, 0) / top.length
    return { anchor: 'bottom', at: { lat: north, lng } }
  }
  const middle = points.reduce((sum, one) => sum + one.lat, 0) / points.length
  const narrow = Math.cos((middle * Math.PI) / 180) || 1
  const ring = points.map(({ lat, lng }) => ({ x: lng * narrow, y: lat }))
  let west = Math.min(...ring.map(({ x }) => x))
  let east = Math.max(...ring.map(({ x }) => x))
  let south = Math.min(...ring.map(({ y }) => y))
  let north = Math.max(...ring.map(({ y }) => y))
  /* **Between two places with the same room, the one nearer the middle.** A
     long area has a line of places as far from its sides as any, and its
     caption belongs halfway along it, not wherever the grid met it first. */
  const center = { x: (west + east) / 2, y: (south + north) / 2 }
  const offCenter = ({ x, y }: Flat): number => Math.hypot(x - center.x, y - center.y)
  const TIE = 0.02
  let best: { point: Flat; room: number } | undefined
  for (let round = 0; round < ROUNDS; round++) {
    const width = (east - west) / CELLS
    const height = (north - south) / CELLS
    for (let column = 0; column < CELLS; column++) {
      for (let row = 0; row < CELLS; row++) {
        const point = { x: west + (column + 0.5) * width, y: south + (row + 0.5) * height }
        if (!inside(point, ring)) {
          continue
        }
        const room = clearance(point, ring)
        const better =
          !best ||
          room > best.room * (1 + TIE) ||
          (room >= best.room * (1 - TIE) && offCenter(point) < offCenter(best.point))
        if (better) {
          best = { point, room }
        }
      }
    }
    if (!best) {
      break
    }
    /* Narrowed to the cells round the best one, for the next round. */
    west = best.point.x - width
    east = best.point.x + width
    south = best.point.y - height
    north = best.point.y + height
  }
  /* An area too thin for any cell to land in it: the middle of its corners. */
  const at = best
    ? { lat: best.point.y, lng: best.point.x / narrow }
    : {
        lat: middle,
        lng: points.reduce((sum, one) => sum + one.lng, 0) / points.length,
      }
  return { anchor: 'center', at }
}
