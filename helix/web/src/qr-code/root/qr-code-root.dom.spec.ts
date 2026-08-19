import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'
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

describe('qr code', () => {
  test('the path is the matrix, module for module', async () => {
    /* Runs are joined, so this cannot be checked by counting nodes. Expanding
       the path back into cells is the only comparison that proves the drawing
       and the encoding agree. */
    const host = await code('<helix-qr-code value="https://helix.fusion.dev"></helix-qr-code>')
    const drawn = cellsOf(svgOf(host).querySelector('path')?.getAttribute('d') ?? '')
    expect(drawn).toEqual(expected('https://helix.fusion.dev', 'M'))
    expect(drawn.size).toBeGreaterThan(100)
  })

  test('and runs are joined rather than drawn one square at a time', async () => {
    // A useful code is a thousand modules. One node per module is a thousand
    // nodes for one picture.
    const host = await code('<helix-qr-code value="https://helix.fusion.dev"></helix-qr-code>')
    const d = svgOf(host).querySelector('path')?.getAttribute('d') ?? ''
    const subpaths = d.split('M').length - 1
    expect(subpaths).toBeLessThan(cellsOf(d).size)
  })

  test('the quiet zone is four modules, and inside the viewBox', async () => {
    /* Required by the specification rather than chosen: a scanner refuses a
       code cropped to its edge. In the `viewBox` so it scales with the code
       and not with whatever box the component was given. */
    const host = await code('<helix-qr-code value="hello"></helix-qr-code>')
    const size = encode('hello', { border: 0, ecc: 'M' }).size
    expect(svgOf(host).getAttribute('viewBox')).toBe(`0 0 ${size + 8} ${size + 8}`)
    expect(svgOf(host).querySelector('path')?.getAttribute('transform')).toBe('translate(4 4)')
  })

  test('it is an image, and its name is what the code is for', async () => {
    // Describing the pattern would tell a reader nothing. Where nothing is
    // passed the value is the name, and a value is almost always a URL.
    const host = await code('<helix-qr-code value="https://fusion.dev"></helix-qr-code>')
    expect(svgOf(host).getAttribute('role')).toBe('img')
    expect(svgOf(host).getAttribute('aria-label')).toBe('https://fusion.dev')

    const named = await code(
      '<helix-qr-code label="Our site" value="https://fusion.dev"></helix-qr-code>',
    )
    expect(svgOf(named).getAttribute('aria-label')).toBe('Our site')
  })

  test('correction is `M` unless asked otherwise', async () => {
    const host = await code('<helix-qr-code correction="L" value="hello"></helix-qr-code>')
    const drawn = cellsOf(svgOf(host).querySelector('path')?.getAttribute('d') ?? '')
    expect(drawn).toEqual(expected('hello', 'L'))
    expect(drawn).not.toEqual(expected('hello', 'M'))
  })

  test('nothing is drawn for nothing, rather than an empty square', async () => {
    const host = await code('<helix-qr-code value=""></helix-qr-code>')
    expect(part(host, 'code')).toBeNull()
  })

  test('a code that changes is re-encoded', async () => {
    const host = await code('<helix-qr-code value="one"></helix-qr-code>')
    const before = svgOf(host).querySelector('path')?.getAttribute('d')
    ;(host as HTMLElement & { value: string }).value = 'two'
    await host.updateComplete
    expect(svgOf(host).querySelector('path')?.getAttribute('d')).not.toBe(before)
  })
})

/* The centre mark needs a real engine: `assignedNodes` is what tells the
   element the slot was filled, and happy-dom does not report it here. */
if (hasLayout()) {
  describe('qr code with a mark in the middle', () => {
    const withLogo = '<helix-qr-code value="hello"><span slot="logo">F</span></helix-qr-code>'

    test('filling the slot raises the correction on its own', async () => {
      /* `H` is what makes covering the centre safe: a code at that level can
         lose thirty percent of itself and still read, and at `L` the same mark
         makes it unscannable. A consumer who filled the slot has said what they
         want without having to know that. */
      const host = await code(withLogo)
      const drawn = cellsOf(svgOf(host).querySelector('path')?.getAttribute('d') ?? '')
      expect(drawn).toEqual(expected('hello', 'H'))
    })

    test('and an explicit correction still wins, because it was asked for', async () => {
      const host = await code(withLogo.replace('value=', 'correction="L" value='))
      const drawn = cellsOf(svgOf(host).querySelector('path')?.getAttribute('d') ?? '')
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
