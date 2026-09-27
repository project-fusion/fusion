import type { MapImage } from '../style/map-style.js'

/** Drawn at twice their size, for sharp screens, and handed to MapLibre as such. */
export const IMAGE_RATIO = 2

/** A drawn image as MapLibre takes it: its pixels, and its size in them. */
export interface DrawnImage {
  data: Uint8Array
  height: number
  width: number
}

/** A highway sign's outline, in a box `width` by `height`, for its shape. */
const outline = (
  context: CanvasRenderingContext2D,
  shape: 'interstate' | 'oval' | 'plate' | 'shield',
  width: number,
  height: number,
  inset: number,
): void => {
  const [left, top, right, bottom] = [inset, inset, width - inset, height - inset]
  const across = right - left
  const down = bottom - top
  context.beginPath()
  if (shape === 'oval') {
    context.ellipse(width / 2, height / 2, across / 2, down / 2, 0, 0, Math.PI * 2)
  } else if (shape === 'plate') {
    context.roundRect(left, top, across, down, down * 0.2)
  } else {
    /* A shield: a top bowed up a little, straight sides, and a rounded point. */
    context.moveTo(left, top + down * 0.12)
    context.quadraticCurveTo(left + across / 2, top - down * 0.06, right, top + down * 0.12)
    context.lineTo(right, top + down * 0.5)
    context.quadraticCurveTo(right, top + down * 0.86, left + across / 2, bottom)
    context.quadraticCurveTo(left, top + down * 0.86, left, top + down * 0.5)
  }
  context.closePath()
}

/**
 * The image a style describes, drawn on a canvas: a landmark's icon on a disc
 * in its tone, ringed in the land so it stands off the map, or a highway sign
 * as wide as its number. `undefined` where there is no canvas to draw on.
 */
export const drawMapImage = (image: MapImage): DrawnImage | undefined => {
  const canvas = document.createElement('canvas')
  const width =
    image.kind === 'landmark' ? 22 * IMAGE_RATIO : Math.max(20, 10 + 7 * image.length) * IMAGE_RATIO
  const height = (image.kind === 'landmark' ? 22 : 20) * IMAGE_RATIO
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    return undefined
  }
  if (image.kind === 'landmark') {
    const middle = width / 2
    context.fillStyle = image.ink
    context.beginPath()
    context.arc(middle, middle, middle, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = image.color
    context.beginPath()
    context.arc(middle, middle, middle - 1.5 * IMAGE_RATIO, 0, Math.PI * 2)
    context.fill()
    /* The icon's own paths, scaled from its box into the middle of the disc. */
    const [, , boxWidth = 256] = image.icon.viewBox.split(/\s+/).map(Number)
    const size = 12 * IMAGE_RATIO
    context.save()
    context.translate(middle - size / 2, middle - size / 2)
    context.scale(size / boxWidth, size / boxWidth)
    context.fillStyle = image.ink
    for (const [, path] of image.icon.content.matchAll(/\sd="([^"]+)"/g)) {
      context.fill(new Path2D(path))
    }
    context.restore()
  } else {
    const line = 1.5 * IMAGE_RATIO
    outline(context, image.shape, width, height, line / 2)
    context.fillStyle = image.fill
    context.fill()
    /* The Interstate's red band across its top, inside the outline. */
    if (image.band) {
      context.save()
      context.clip()
      context.fillStyle = image.band
      context.fillRect(0, 0, width, height * 0.3)
      context.restore()
      outline(context, image.shape, width, height, line / 2)
    }
    context.lineWidth = line
    context.strokeStyle = image.edge
    context.stroke()
  }
  const { data } = context.getImageData(0, 0, width, height)
  return { data: new Uint8Array(data.buffer.slice(0)), height, width }
}
