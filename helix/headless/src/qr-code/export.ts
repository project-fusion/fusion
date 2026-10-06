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
  /** The logo in the middle, where one is slotted and can be written into a file. */
  logo?: QrLogo
}

/** A place in the drawing, in `viewBox` units: x, y, width and height. */
export type QrBox = readonly [number, number, number, number]

/** The slotted logo, read from the element, as a file can carry it. */
export interface QrLogo {
  /** The box around the mark, which clears the modules under it. */
  frame: QrBox
  /** The fill of that box. */
  ground: string
  /** An image's address, written as an `<image>`. */
  href?: string
  /** Where the mark sits inside the box. */
  mark: QrBox
  /** An inline SVG's markup, written as a nested `<svg>` at the mark's place. */
  svg?: string
}

/** A rectangle the page measured, as `getBoundingClientRect` gives one. */
export interface QrRect {
  readonly height: number
  readonly left: number
  readonly top: number
  readonly width: number
}

/**
 * A rectangle measured on the page as a place in the drawing: `area` is the
 * drawn code's own rectangle and `box` the side of its `viewBox`, so a logo
 * set over the code by a stylesheet lands where it was drawn.
 */
export const boxIn = (rect: QrRect, area: QrRect, box: number): QrBox => {
  const scale = box / area.width
  return [
    (rect.left - area.left) * scale,
    (rect.top - area.top) * scale,
    rect.width * scale,
    rect.height * scale,
  ]
}

/**
 * The logo's box in the drawing, or nothing where any of it falls outside the
 * code, such as a logo the headless tier sets beside the code rather than
 * over it, which a file of the code alone has no place for.
 */
export const logoBox = (rect: QrRect, area: QrRect, box: number): QrBox | undefined => {
  const frame = boxIn(rect, area, box)
  const [x, y, width, height] = frame
  return x < 0 || y < 0 || x + width > box || y + height > box ? undefined : frame
}

/** Escapes a value for a double-quoted XML attribute. */
const attribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** A number for an attribute, to two places, which is far finer than a module. */
const unit = (value: number): string => String(Math.round(value * 100) / 100)

/** `x`, `y`, `width` and `height` for a box. */
const placed = ([x, y, width, height]: QrBox): string =>
  `x="${unit(x)}" y="${unit(y)}" width="${unit(width)}" height="${unit(height)}"`

/**
 * The logo as the file writes it: its box, then the mark, as an `<image>` or as
 * the slotted SVG moved to the mark's place. Nothing for a mark that is
 * neither, such as text, which a file of its own cannot carry in the page's
 * fonts.
 */
export const qrLogo = (logo: QrLogo): string => {
  const ground = `<rect ${placed(logo.frame)} fill="${attribute(logo.ground)}"/>`
  if (logo.href) {
    return `${ground}<image ${placed(logo.mark)} href="${attribute(logo.href)}" preserveAspectRatio="xMidYMid meet"/>`
  }
  if (logo.svg) {
    /* The slotted SVG's own place, size and slot go, and the mark's take
       over. */
    const mark = logo.svg.replace(
      /^\s*<svg\b([^>]*)>/,
      (_, rest: string) =>
        `<svg${rest.replace(/\s(?:x|y|width|height|slot)="[^"]*"/g, '')} ${placed(logo.mark)}>`,
    )
    return `${ground}${mark}`
  }
  return ''
}

/**
 * The code as standalone SVG markup, sized `size` pixels square.
 *
 * The background is a rectangle under the code, since a scanner needs the
 * light quiet zone and a transparent file put on a dark page has none. A
 * logo goes over the code, as it is drawn on the page.
 */
export const qrSvg = (drawing: QrDrawing, size: number): string => {
  const shift = `translate(${drawing.quiet} ${drawing.quiet})`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${drawing.box} ${drawing.box}"` +
    ` width="${size}" height="${size}" shape-rendering="crispEdges">` +
    `<rect width="${drawing.box}" height="${drawing.box}" fill="${attribute(drawing.background)}"/>` +
    `<path d="${attribute(drawing.modules)}" transform="${shift}" fill="${attribute(drawing.moduleColor)}"/>` +
    `<path d="${attribute(drawing.finders)}" transform="${shift}" fill="${attribute(drawing.finderColor)}"/>` +
    (drawing.logo ? qrLogo(drawing.logo) : '') +
    '</svg>'
  )
}
