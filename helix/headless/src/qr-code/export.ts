/**
 * A drawn code as a file of its own: an SVG with its colors written in, which
 * an image can load and a canvas can turn into a PNG.
 *
 * Beside the family's `index.ts`, because writing a file is not the element's
 * template, and the markup is a pure function of what the element drew.
 */

/** What a code is drawn with, read from the element once it has rendered. */
export interface QrDrawing {
  /** The fill behind the code, quiet zone included. */
  background: string
  /** The side of the `viewBox`, quiet zone included. */
  box: number
  /** The color of the corner squares. */
  finderColor: string
  /** The path of the corner squares. */
  finders: string
  /** The color of every other module. */
  moduleColor: string
  /** The path of every other module. */
  modules: string
  /** The quiet zone, in modules, that both paths are moved in by. */
  quiet: number
}

/** Escapes a value for a double-quoted XML attribute. */
const attribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * The code as standalone SVG markup, sized `size` pixels square.
 *
 * The background is a rectangle under the code, since a scanner needs the
 * light quiet zone and a transparent file put on a dark page has none.
 */
export const qrSvg = (drawing: QrDrawing, size: number): string => {
  const shift = `translate(${drawing.quiet} ${drawing.quiet})`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${drawing.box} ${drawing.box}"` +
    ` width="${size}" height="${size}" shape-rendering="crispEdges">` +
    `<rect width="${drawing.box}" height="${drawing.box}" fill="${attribute(drawing.background)}"/>` +
    `<path d="${attribute(drawing.modules)}" transform="${shift}" fill="${attribute(drawing.moduleColor)}"/>` +
    `<path d="${attribute(drawing.finders)}" transform="${shift}" fill="${attribute(drawing.finderColor)}"/>` +
    '</svg>'
  )
}
