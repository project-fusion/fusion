import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'
import { encode } from 'uqr'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Code = HTMLElement & { updateComplete: Promise<boolean> }

const code = async (markup: string): Promise<Code> => {
  const host = (await mount(markup)) as Code
  await host.updateComplete
  return host
}

/**
 * Reads a rendered path back into the cells it fills.
 *
 * The point of the component's path is that it is the matrix and nothing else,
 * so the way to check it is to undo it: every subpath is `M x y h n v1 h-n z`,
 * one run of dark modules, and expanding them all should give back exactly the
 * set the encoder produced. Comparing the string to a fixture would only prove
 * it had not changed.
 */
const cellsOf = (d: string): Set<string> => {
  const found = new Set<string>()
  for (const [, x, y, run] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let step = 0; step < Number(run); step += 1) {
      found.add(`${Number(x) + step},${y}`)
    }
  }
  return found
}

const expected = (value: string, ecc: 'H' | 'L' | 'M' | 'Q'): Set<string> => {
  const { data } = encode(value, { border: 0, ecc })
  const found = new Set<string>()
  for (const [y, row] of data.entries()) {
    for (const [x, on] of row.entries()) {
      if (on) {
        found.add(`${x},${y}`)
      }
    }
  }
  return found
}

const svgOf = (host: Code): SVGElement => part(host, 'code') as unknown as SVGElement

/**
 * Every cell either path fills, which is what "the code" means now.
 *
 * The drawing is two paths, the modules and the three corner squares, so that
 * the finders can take a color of their own: one path is one fill. Anything
 * asking whether the picture matches the encoder has to put them back together.
 */
const allCells = (host: Code): Set<string> => {
  const found = new Set<string>()
  for (const path of svgOf(host).querySelectorAll('path')) {
    for (const cell of cellsOf(path.getAttribute('d') ?? '')) {
      found.add(cell)
    }
  }
  return found
}

/* The mark in the middle and the ink it is drawn in, which are this tier's.

   The behavior is the headless element's and is tested there. */
if (hasLayout()) {
  describe('qr code with a mark in the middle', () => {
    test('it is ink on paper, and stays that way in a dark page', async () => {
      /* A code drawn light on dark is refused by a good half of the scanners in
         the world. The first version stated both colours, which is right, and
         stated them with tokens that turn over with the mode, which undid it: on
         a dark page the ground went dark and the modules went light. The media
         pair is the only one here that does not turn over, so a code uses it
         inverted, and this asserts the direction rather than the values. */
      const host = await code('<helix-qr-code value="hello"></helix-qr-code>')
      const cs = getComputedStyle(host)
      const lightness = (value: string): number =>
        Number(/oklch\(\s*([\d.]+)/.exec(value)?.[1] ?? Number.NaN)
      const ground = lightness(cs.backgroundColor)
      const ink = lightness(cs.color)
      expect(Number.isNaN(ground)).toBe(false)
      expect(Number.isNaN(ink)).toBe(false)
      expect(ground).toBeGreaterThan(ink)
    })

    const withLogo = '<helix-qr-code value="hello"><span slot="logo">F</span></helix-qr-code>'

    test('filling the slot raises the correction on its own', async () => {
      /* `H` is what makes covering the center safe: a code at that level can
         lose thirty percent of itself and still read, and at `L` the same mark
         makes it unscannable. A consumer who filled the slot has said what they
         want without having to know that. */
      const host = await code(withLogo)
      const drawn = allCells(host)
      expect(drawn).toEqual(expected('hello', 'H'))
    })

    test('and an explicit correction still wins, because it was asked for', async () => {
      const host = await code(withLogo.replace('value=', 'correction="L" value='))
      const drawn = allCells(host)
      expect(drawn).toEqual(expected('hello', 'L'))
    })

    test('the box is drawn only when something is in it', async () => {
      const bare = await code('<helix-qr-code value="hello"></helix-qr-code>')
      expect((part(bare, 'logo') as HTMLElement).hidden).toBe(true)

      const marked = await code(withLogo)
      expect((part(marked, 'logo') as HTMLElement).hidden).toBe(false)
    })
  })
}
