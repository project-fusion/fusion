import { FLAT, fieldFromCells, fieldFromPath, type ShapeField } from './shape-field.js'

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
 * polygon in it, together, their holes cut by the even-odd rule. Each shape
 * with an `id`, or in a group with one, is a named part.
 *
 * Transforms on the shapes are not read: draw the outline in the `viewBox`'s
 * own units, as an exported icon or logo is.
 */
export const shapeFromSvg = (svg: SVGSVGElement | string, resolution = FLAT): ShapeField => {
  const element =
    typeof svg === 'string'
      ? new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
      : svg
  const [left = 0, top = 0, width = 0, height = 0] = (element.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  /* A `viewBox` that starts somewhere other than 0, as `-50 -50 100 100` does. */
  const origin = { x: Number.isFinite(left) ? left : 0, y: Number.isFinite(top) ? top : 0 }
  const box = {
    height: height || Number(element.getAttribute('height') ?? 0),
    width: width || Number(element.getAttribute('width') ?? 0),
  }
  const shapes = [...element.querySelectorAll('path, rect, circle, ellipse, polygon')]
  const path = shapes.map(pathOf).join(' ')
  const field = fieldFromPath(path, box.width || 1, box.height || 1, resolution, origin)
  /* **Each shape with an `id`, or inside a group with one, a named part**,
     so a page can send a group of notes to a state on a map by its id. */
  const named = shapes.flatMap((shape) => {
    const name = shape.closest('[id]')?.getAttribute('id')
    return name && shape.closest('[id]') !== element ? [{ name, path: pathOf(shape) }] : []
  })
  return named.length > 0
    ? { ...field, regionOf: partsOf(named, field, resolution, origin) }
    : field
}

/**
 * Which named part a point of a flat shape is in, read off a grid each part
 * is drawn into once, each in a color of its own. A point on no part, as
 * between two or on a part's softened edge, takes the nearest part a few
 * cells away.
 */
const partsOf = (
  named: readonly { name: string; path: string }[],
  box: { height: number; width: number },
  resolution: number,
  origin: { x: number; y: number },
): ((x: number, y: number) => string | undefined) => {
  const cell = Math.max(box.width, box.height, 1) / resolution
  const nx = Math.max(1, Math.ceil(box.width / cell))
  const ny = Math.max(1, Math.ceil(box.height / cell))
  const canvas = document.createElement('canvas')
  canvas.width = nx
  canvas.height = ny
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const labels = new Uint16Array(nx * ny)
  if (context) {
    context.scale(1 / cell, 1 / cell)
    context.translate(-origin.x, -origin.y)
    named.forEach(({ path }, at) => {
      const label = at + 1
      context.fillStyle = `rgb(${label & 255}, ${(label >> 8) & 255}, 0)`
      context.fill(new Path2D(path), 'evenodd')
    })
    const pixels = context.getImageData(0, 0, nx, ny).data
    for (let at = 0; at < labels.length; at++) {
      /* Only a pixel wholly one part's color: an edge blends two. */
      if ((pixels[at * 4 + 3] ?? 0) === 255 && (pixels[at * 4 + 2] ?? 0) === 0) {
        const label = (pixels[at * 4] ?? 0) + ((pixels[at * 4 + 1] ?? 0) << 8)
        labels[at] = label <= named.length ? label : 0
      }
    }
  }
  return (x, y) => {
    const column = Math.floor(x / cell)
    const row = Math.floor(y / cell)
    for (let ring = 0; ring <= 3; ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          const c = column + dx
          const r = row + dy
          if (c < 0 || r < 0 || c >= nx || r >= ny) {
            continue
          }
          const label = labels[r * nx + c] ?? 0
          if (label > 0) {
            return named[label - 1]?.name
          }
        }
      }
    }
    return undefined
  }
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
