/*
 * What covers the ground on a map: `@fusion.dev/helix-headless/map/landcover`.
 *
 * Its own entry, because most maps leave the ground plain: a map that draws no
 * forest, farmland or water carries none of this code. Importing it registers
 * the element.
 */
export * from './map-landcover.js'
