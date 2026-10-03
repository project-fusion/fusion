import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'

let shapeFromSvg: typeof import('./flat.js').shapeFromSvg

beforeAll(async () => {
  registerDom()
  ;({ shapeFromSvg } = await import('./flat.js'))
})

/* A canvas draws the outline, which only a browser has. */
const run = hasLayout() ? test : (): void => {}

describe('shapeFromSvg', () => {
  run('reads a viewBox that starts somewhere other than 0 from where it starts', () => {
    /* A square in the middle of a box from -50 to 50, the left half `west` and the right `east`. */
    const field = shapeFromSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">
        <rect id="west" x="-25" y="-25" width="25" height="50" />
        <rect id="east" x="0" y="-25" width="25" height="50" />
      </svg>`,
      100,
    )
    expect(field.width).toBe(100)
    expect(field.distance(50, 50, 0)).toBeLessThan(0)
    expect(field.distance(10, 10, 0)).toBeGreaterThan(0)
    expect(field.regionOf?.(35, 50)).toBe('west')
    expect(field.regionOf?.(65, 50)).toBe('east')
  })
})
