/*
 * The points a route passes through and an area is drawn around, read from
 * their attribute. A module that registers nothing, so Area reads its points
 * without registering Route: each layer has an entry of its own.
 */

/** A place a line passes through or a shape is drawn around, in degrees. */
export interface MapPoint {
  lat: number
  lng: number
}

/**
 * `points` as it is written: `lat,lng` pairs separated by spaces, the order a
 * marker's own `lat` and `lng` read in. A pair that is not two numbers is
 * dropped rather than drawn at the origin, **an empty side included**:
 * `Number('')` is 0, so `30.1,` from a record with no longitude was a vertex
 * off West Africa.
 */
export const pointsOf = (value: string | null): MapPoint[] =>
  (value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => pair.split(','))
    .filter((pair) => pair.length === 2 && pair.every((one) => one.trim() !== ''))
    .map((pair) => pair.map(Number))
    .filter((pair) => pair.every((one) => Number.isFinite(one)))
    .map(([lat, lng]) => ({ lat: lat as number, lng: lng as number }))

/** `points` read from its attribute, which is written and never reflected. */
export const pointsConverter = { fromAttribute: pointsOf }
