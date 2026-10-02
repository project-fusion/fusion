import {
  FLAT,
  fieldFromCells,
  fieldFromPath,
  type ShapeField,
} from '../connect-graph/shape-field.js'

/** The path an SVG shape element draws, as a path's `d`. */
const pathOf = (element: Element): string => {
  const number = (name: string): number => Number(element.getAttribute(name) ?? 0)
  switch (element.localName) {
    case 'path':
      return element.getAttribute('d') ?? ''
    case 'rect': {
      const [x, y, width, height] = [number('x'), number('y'), number('width'), number('height')]
      return `M${x} ${y}h${width}v${height}h${-width}Z`
    }
    case 'circle':
    case 'ellipse': {
      const [cx, cy] = [number('cx'), number('cy')]
      const rx = element.localName === 'circle' ? number('r') : number('rx')
      const ry = element.localName === 'circle' ? number('r') : number('ry')
      return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`
    }
    case 'polygon': {
      const points = element.getAttribute('points')?.trim() ?? ''
      return points ? `M${points}Z` : ''
    }
    default:
      return ''
  }
}

/**
 * A flat field from an SVG: an `<svg>` element, or its markup. Its box is
 * its `viewBox`, and its shape every path, rectangle, circle, ellipse and
 * polygon in it, together, their holes cut by the even-odd rule.
 *
 * Transforms on the shapes are not read: draw the outline in the `viewBox`'s
 * own units, as an exported icon or logo is.
 */
export const shapeFromSvg = (svg: SVGSVGElement | string, resolution = FLAT): ShapeField => {
  const element =
    typeof svg === 'string'
      ? new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
      : svg
  const [, , width = 0, height = 0] = (element.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  const box = {
    height: height || Number(element.getAttribute('height') ?? 0),
    width: width || Number(element.getAttribute('width') ?? 0),
  }
  const path = [...element.querySelectorAll('path, rect, circle, ellipse, polygon')]
    .map(pathOf)
    .join(' ')
  return fieldFromPath(path, box.width || 1, box.height || 1, resolution)
}

/** How an image is read as a shape. */
export interface ImageOptions {
  /** How opaque a pixel is to be inside, from 0 to 1. 0.5 by default. */
  threshold?: number | undefined
  /** How many cells the field has along the image's longer side. 512 by default. */
  resolution?: number | undefined
}

/**
 * A flat field from an image's opaque pixels: a logo, a silhouette, or a
 * mask drawn for the purpose. Its box is the image's size in pixels.
 *
 * An image from another site is read only where that site allows it, as a
 * canvas reads any image.
 */
export const shapeFromImage = (
  image: CanvasImageSource & {
    height: number | SVGAnimatedLength
    width: number | SVGAnimatedLength
  },
  { resolution = FLAT, threshold = 0.5 }: ImageOptions = {},
): ShapeField => {
  const size = (value: number | SVGAnimatedLength): number =>
    typeof value === 'number' ? value : value.baseVal.value
  const width = Math.max(size(image.width), 1)
  const height = Math.max(size(image.height), 1)
  const cell = Math.max(width, height) / resolution
  const nx = Math.max(1, Math.ceil(width / cell))
  const ny = Math.max(1, Math.ceil(height / cell))
  const canvas = document.createElement('canvas')
  canvas.width = nx
  canvas.height = ny
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const cells = new Uint8Array(nx * ny)
  if (context) {
    context.drawImage(image, 0, 0, nx, ny)
    const alpha = context.getImageData(0, 0, nx, ny).data
    for (let at = 0; at < cells.length; at++) {
      cells[at] = (alpha[at * 4 + 3] ?? 0) / 255 >= threshold ? 1 : 0
    }
  }
  return fieldFromCells(cells, [nx, ny, 1], cell, { depth: 0, height, width })
}
