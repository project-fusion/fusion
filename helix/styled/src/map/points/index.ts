/*
 * The places a map loads from data: `@fusion.dev/helix/map/points`.
 *
 * Its own entry, because most maps hold a handful of markers written in the
 * page: a map that loads no data carries none of the code that clusters it.
 * Importing it registers the element.
 */
export * from './map-points.js'
