import type { MapPlace } from './driver.js'

/** Meters in a degree of latitude, which is near enough constant for a ring. */
export const METERS_PER_DEGREE = 111_320

/**
 * How far along a line each of its points is, in meters from the first:
 * degrees with longitude narrowed by the latitude, which is a flat map's idea
 * of length and near enough over a city.
 *
 * **The one measure of a route's progress.** A route is cut at its `progress`
 * by this, so a page moving something along the route measures with it too:
 * measured in plain degrees, a walker's share of the walk and the connector's
 * cut disagreed by up to a hundred meters, and the line under the walker was
 * still bright behind it.
 */
export const distancesAlong = (points: readonly MapPlace[]): number[] => {
  let total = 0
  return points.map((point, at) => {
    const from = points[at - 1]
    if (from) {
      total +=
        Math.hypot(
          point.lat - from.lat,
          (point.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180),
        ) * METERS_PER_DEGREE
    }
    return total
  })
}

/** A line cut at a fraction of its length, by `distancesAlong`, into the part behind and the part ahead, the cut point on both. */
export const cutAlong = (points: MapPlace[], fraction: number): [MapPlace[], MapPlace[]] => {
  const along = distancesAlong(points)
  const legs = along.slice(1).map((distance, at) => distance - (along[at] as number))
  let left = (along.at(-1) ?? 0) * fraction
  for (let at = 0; at < legs.length; at++) {
    const leg = legs[at] as number
    if (left <= leg) {
      const [from, to] = [points[at] as MapPlace, points[at + 1] as MapPlace]
      const part = leg > 0 ? left / leg : 0
      const middle = {
        lat: from.lat + (to.lat - from.lat) * part,
        lng: from.lng + (to.lng - from.lng) * part,
      }
      return [
        [...points.slice(0, at + 1), middle],
        [middle, ...points.slice(at + 1)],
      ]
    }
    left -= leg
  }
  return [points, []]
}
