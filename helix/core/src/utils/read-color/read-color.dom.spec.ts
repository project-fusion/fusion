import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { paintedColor, readColor, rgbOf } from './read-color.js'

/* Read once the page exists: a spec that runs first finds no `document` at import. */
let create: typeof document.createElement

beforeAll(() => {
  registerDom()
  create = document.createElement.bind(document)
})

afterEach(() => {
  document.createElement = create
})

/** A canvas whose one pixel reads back as these bytes, whatever is painted. */
const pixelReads = (bytes: number[]): string[] => {
  const painted: string[] = []
  const context = {
    fillRect: () => {},
    set fillStyle(value: string) {
      painted.push(value)
    },
    getImageData: () => ({ data: Uint8ClampedArray.from(bytes) }),
  }
  document.createElement = ((tag: string) =>
    tag === 'canvas'
      ? ({ getContext: () => context } as unknown as HTMLCanvasElement)
      : create(tag)) as typeof document.createElement
  return painted
}

describe('a computed color written as rgb', () => {
  test('is what the pixel reads back', () => {
    const painted = pixelReads([12, 34, 56, 255])
    expect(rgbOf('oklch(0.4 0.1 250)')).toBe('rgb(12, 34, 56)')
    expect(painted).toEqual(['oklch(0.4 0.1 250)'])
  })

  test('keeps its alpha where it is see-through', () => {
    pixelReads([255, 0, 0, 51])
    expect(rgbOf('color(srgb 1 0 0 / 0.2)')).toBe('rgba(255, 0, 0, 0.2)')
  })

  test('stays as it is where there is no canvas to paint it on', () => {
    document.createElement = ((tag: string) =>
      tag === 'canvas'
        ? ({ getContext: () => null } as unknown as HTMLCanvasElement)
        : create(tag)) as typeof document.createElement
    expect(rgbOf('oklch(0.4 0.1 250)')).toBe('oklch(0.4 0.1 250)')
  })
})

describe('a computed color read as bytes', () => {
  test('is refused where there is no canvas to read it from', () => {
    document.createElement = ((tag: string) =>
      tag === 'canvas'
        ? ({ getContext: () => null } as unknown as HTMLCanvasElement)
        : create(tag)) as typeof document.createElement
    expect(readColor('oklch(0.5 0.1 120)')).toBeUndefined()
  })
})

/**
 * A context that parses what `colors` holds, ignores anything else as a real
 * one does, and reads back `bytes` for the pixel.
 */
const context = (colors: string[], bytes: number[]): CanvasRenderingContext2D => {
  let style = '#000000'
  return {
    clearRect: () => {},
    fillRect: () => {},
    get fillStyle() {
      return style
    },
    set fillStyle(value: string) {
      if (colors.includes(value) || value.startsWith('#')) {
        style = value
      }
    },
    getImageData: () => ({ data: Uint8ClampedArray.from(bytes) }),
  } as unknown as CanvasRenderingContext2D
}

/* A see-through color was painted over black and over white, read back two
   ways, and refused as if it did not parse: Orb drew it gray. */
describe('a computed color painted onto a clear pixel', () => {
  test('keeps its alpha where it is see-through', () => {
    expect(
      paintedColor(context(['rgb(255 0 0 / 50%)'], [255, 0, 0, 128]), 'rgb(255 0 0 / 50%)'),
    ).toEqual([255, 0, 0, 0.502])
  })

  test('is opaque where it is', () => {
    expect(paintedColor(context(['lab(100 0 0)'], [255, 255, 255, 255]), 'lab(100 0 0)')).toEqual([
      255, 255, 255, 1,
    ])
  })

  test('is refused where the engine does not parse it', () => {
    expect(paintedColor(context([], [0, 0, 0, 255]), 'not-a-color')).toBeUndefined()
  })
})
