import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { readColor, rgbOf } from './read-color.js'

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
