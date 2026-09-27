import type { MapImage } from '../style/map-style.js'

/** Drawn at twice their size, for sharp screens, and handed to MapLibre as such. */
export const IMAGE_RATIO = 2

/** A drawn image as MapLibre takes it: its pixels, and its size in them. */
export interface DrawnImage {
  data: Uint8Array
  height: number
  width: number
}

/**
 * **The official sign outlines**, in the 600-unit boxes the Federal Highway
 * Administration's standard drawings use, traced from the public-domain blank
 * markers on Wikimedia Commons (`I-blank.svg`, `US_blank.svg`): the
 * Interstate shield, its blue field and red crown, and the US route shield.
 * Each part is a path and, where the drawing places it, a transform.
 */
const INTERSTATE = {
  crown: {
    d: 'M31.324219,124.99902C43.579102,85.77832 62.362793,49.44043 86.402832,17.259766C119.50439,26.392578 154.37061,31.272461 190.37695,31.272461C228.4375,31.272461 265.22461,25.820801 300,15.654785C334.77539,25.820801 371.5625,31.272461 409.62305,31.272461C445.62891,31.272461 480.49609,26.392578 513.59766,17.259766C537.63672,49.44043 556.4209,85.77832 568.67578,124.99902L31.324219,124.99902z',
    transform: [1.0125461, 0, 0, 1.0271486, -3.7638021, -3.1017481],
  },
  field: {
    d: 'M15,232.5C15,200.521 19.169434,169.51611 26.994629,139.99902L573.00586,139.99902C580.83008,169.51611 585,200.521 585,232.5C585,405.60547 462.82617,550.17188 300,584.67676C137.17432,550.17188 15,405.60547 15,232.5z',
    transform: [1.0070935, 0, 0, 1.0102847, -2.1280324, -3.66885],
  },
  outline: {
    d: 'M80.75293,0C115.42871,10.583496 152.23779,16.276856 190.37695,16.276856C228.51563,16.276856 265.32422,10.583496 300,0.0004883C334.67578,10.583496 371.48438,16.276856 409.62305,16.276856C447.76172,16.276856 484.57129,10.583496 519.24707,0C569.8125,63.908203 600,144.67822 600,232.5C600,413.92383 471.16992,565.25391 300,599.99902C128.83008,565.25391 0,413.92383 0,232.5C0,144.67822 30.187988,63.907715 80.75293,0z',
    transform: [0.9983361, 0, 0, 0.9983377, 0.4991681, 0.4986858],
  },
}

const US_ROUTE =
  'M300,10.0024414c23.5644531,20.0751953,54.1171875,32.1914063,87.5,32.1914063S451.4355469,30.0751953,475,10l115,115c-21.1621094,30.0805664-33.5878906,66.753418-33.5878906,106.3271484c0,28.4628906,6.4267578,55.4238281,17.9101563,79.5117188C584.2441406,331.6640625,590,355.3945313,590,380c0,88.3671875-71.6328125,160-160,160h-25.1132813C362.5419922,540,324.7509766,559.4951172,300,590c-24.7514648-30.5048828-62.5419922-50-104.8867188-50h-25.1137695c-88.3666992,0-160-71.6328125-160-160c0-24.6054688,5.7563477-48.3359375,15.6787109-69.1611328c11.4824219-24.0878906,17.9101563-51.0488281,17.9101563-79.5117188C43.5883789,191.753418,31.1616211,155.0805664,10,125L125,10c23.5644531,20.0751953,54.1166992,32.1938477,87.5,32.1938477C245.8828125,42.1938477,276.4355469,30.0776367,300,10.0024414z'

/** The drawings' box, in their own units. */
const BOX = 600

/** A sign's width for its number, as a share of its height: wider for three digits and more. */
const across = (length: number): number => (length <= 2 ? 1 : length === 3 ? 1.25 : 1.5)

/**
 * A highway sign, `width` by `height`: the drawing scaled to the box, a wider
 * number stretching it across, and each outline stroked a pixel and a half
 * wide whatever the stretch.
 */
const drawSign = (
  context: CanvasRenderingContext2D,
  image: Extract<MapImage, { kind: 'sign' }>,
  width: number,
  height: number,
): void => {
  const line = 1.5 * IMAGE_RATIO
  const part = (d: string, fill: string, transform?: readonly number[], stroke?: string): void => {
    context.save()
    context.scale(width / BOX, height / BOX)
    if (transform) {
      const [a = 1, b = 0, c = 0, e = 1, f = 0, g = 0] = transform
      context.transform(a, b, c, e, f, g)
    }
    const path = new Path2D(d)
    context.fillStyle = fill
    context.fill(path)
    if (stroke) {
      context.lineWidth = (line * BOX) / height
      context.strokeStyle = stroke
      context.stroke(path)
    }
    context.restore()
  }
  if (image.design === 'interstate') {
    part(INTERSTATE.outline.d, '#ffffff', INTERSTATE.outline.transform, '#1a1a1a')
    part(INTERSTATE.field.d, '#003f87', INTERSTATE.field.transform)
    part(INTERSTATE.crown.d, '#af1e2d', INTERSTATE.crown.transform)
    return
  }
  if (image.design === 'us') {
    part(US_ROUTE, '#ffffff', undefined, '#1a1a1a')
    return
  }
  context.beginPath()
  if (image.design === 'state') {
    context.ellipse(width / 2, height / 2, width / 2 - line, height / 2 - line, 0, 0, Math.PI * 2)
    context.fillStyle = '#ffffff'
    context.strokeStyle = '#1a1a1a'
  } else {
    context.roundRect(line / 2, line / 2, width - line, height - line, height * 0.2)
    context.fillStyle = image.fill ?? '#ffffff'
    context.strokeStyle = image.edge ?? '#1a1a1a'
  }
  context.fill()
  context.lineWidth = line
  context.stroke()
}

/**
 * The image a style describes, drawn on a canvas: a landmark's icon on a disc
 * in its hue, ringed in the land so it stands off the map, or a highway sign
 * as wide as its number. `undefined` where there is no canvas to draw on.
 */
export const drawMapImage = (image: MapImage): DrawnImage | undefined => {
  const canvas = document.createElement('canvas')
  const height = (image.kind === 'landmark' ? 22 : 22) * IMAGE_RATIO
  const width =
    image.kind === 'landmark'
      ? height
      : image.design === 'plate'
        ? Math.max(20, 10 + 7 * image.length) * IMAGE_RATIO
        : Math.round(height * across(image.length))
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
    drawSign(context, image, width, height)
  }
  const { data } = context.getImageData(0, 0, width, height)
  return { data: new Uint8Array(data.buffer.slice(0)), height, width }
}
