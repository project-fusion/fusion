/**
 * How many places the Maps page's points layer draws, written by
 * `scripts/fetch-map-points.mjs` with the file it counts, so the page's words
 * and its data cannot disagree.
 */
export const AUSTIN_PLACES = 3252

/**
 * **Where the points map opens**: the middle of greater Austin, at a zoom that
 * shows it whole in the wide layout's column and nearly whole in a phone's.
 * A center and a zoom rather than the bounds fitted, so the snapshot the page
 * draws on the server is the map at any width: a flat map at one zoom shows
 * the same streets in the same places, and a narrower box shows less of it.
 */
export const POINTS_VIEW = {
  center: { lat: 30.32, lng: -97.755 },
  /* Drawn as large as the demo's box gets, its column's width by 34rem at
     most, so any box shows the snapshot's middle and none runs past it. */
  height: 560,
  width: 760,
  zoom: 9.6,
}
