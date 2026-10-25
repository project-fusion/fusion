/*
 * The frame around a map: `@fusion.dev/helix-headless/map/root`.
 *
 * Its own entry, because a page that writes a map imports the layers it draws
 * beside the frame, each from its own entry. Importing it registers the frame
 * and none of them.
 */
export * from './map-root.js'
