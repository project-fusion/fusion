/*
 * The spatial charts' drawing, as numbers: a table read as points and axes,
 * and the box those stand in, seen from a camera that turns and tilts. The
 * web's elements draw them in SVG, and a phone in react-native-svg, so both
 * stand every reading at one place.
 */

export { type Camera, type PagePoint, shortNumber } from '../projection/projection.js'
export * from './bar-picture.js'
export * from './bar-row.js'
export * from './bars.js'
export * from './box.js'
export * from './field.js'
export * from './ribbons.js'
