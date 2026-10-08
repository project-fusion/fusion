/*
 * Tiles over the map, such as weather, or imagery of the ground: `@fusion.dev/helix-headless/map/raster`.
 *
 * Its own entry, so a map without one carries none of it. A page that writes
 * `<helix-headless-map-raster>` in a map imports this beside the family's.
 */
export { HelixHeadlessMapRaster } from './map-raster.js'
