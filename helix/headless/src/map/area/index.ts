/*
 * A shape on a map: `@fusion.dev/helix-headless/map/area`.
 *
 * Its own entry, because most maps draw no shapes: a map that only pins places
 * or draws a route carries none of this code. Importing it registers the
 * element.
 */
export * from './map-area.js'
