import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
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

describe('qr code', () => {
  test('the path is the matrix, module for module', async () => {
    /* Runs are joined, so this cannot be checked by counting nodes. Expanding
       the path back into cells is the only comparison that proves the drawing
       and the encoding agree. */
    const host = await code(
      '<helix-headless-qr-code value="https://helix.fusion.dev"></helix-headless-qr-code>',
    )
    const drawn = allCells(host)
    expect(drawn).toEqual(expected('https://helix.fusion.dev', 'M'))
    expect(drawn.size).toBeGreaterThan(100)
  })

  test('and runs are joined rather than drawn one square at a time', async () => {
    // A useful code is a thousand modules. One node per module is a thousand
    // nodes for one picture.
    const host = await code(
      '<helix-headless-qr-code value="https://helix.fusion.dev"></helix-headless-qr-code>',
    )
    const d = svgOf(host).querySelector('path')?.getAttribute('d') ?? ''
    const subpaths = d.split('M').length - 1
    expect(subpaths).toBeLessThan(cellsOf(d).size)
  })

  test('the quiet zone is four modules, and inside the viewBox', async () => {
    /* Required by the specification rather than chosen: a scanner refuses a
       code cropped to its edge. In the `viewBox` so it scales with the code
       and not with whatever box the component was given. */
    const host = await code('<helix-headless-qr-code value="hello"></helix-headless-qr-code>')
    const size = encode('hello', { border: 0, ecc: 'M' }).size
    expect(svgOf(host).getAttribute('viewBox')).toBe(`0 0 ${size + 8} ${size + 8}`)
    expect(svgOf(host).querySelector('path')?.getAttribute('transform')).toBe('translate(4 4)')
  })

  test('it is an image, and its name is what the code is for', async () => {
    // Describing the pattern would tell a reader nothing. Where nothing is
    // passed the value is the name, and a value is almost always a URL.
    const host = await code(
      '<helix-headless-qr-code value="https://fusion.dev"></helix-headless-qr-code>',
    )
    expect(svgOf(host).getAttribute('role')).toBe('img')
    expect(svgOf(host).getAttribute('aria-label')).toBe('https://fusion.dev')

    const named = await code(
      '<helix-headless-qr-code label="Our site" value="https://fusion.dev"></helix-headless-qr-code>',
    )
    expect(svgOf(named).getAttribute('aria-label')).toBe('Our site')
  })

  test('correction is `M` unless asked otherwise', async () => {
    const host = await code(
      '<helix-headless-qr-code correction="L" value="hello"></helix-headless-qr-code>',
    )
    const drawn = allCells(host)
    expect(drawn).toEqual(expected('hello', 'L'))
    expect(drawn).not.toEqual(expected('hello', 'M'))
  })

  test('every shape covers exactly the modules the encoder set', async () => {
    /* A scanner reads contrast between cells, not their shape, so what matters
       is coverage rather than geometry. `dots` and `rounded` draw one shape per
       module, so their subpath starts *are* the modules; `square` joins runs, so
       its starts are fewer and only have to be a subset. The finders are drawn
       square in every case and are checked separately. */
    const value = 'https://helix.fusion.dev'
    const { data, size } = encode(value, { border: 0, ecc: 'M' })
    const finder = (x: number, y: number): boolean =>
      (x < 8 && y < 8) || (size - 1 - x < 8 && y < 8) || (x < 8 && size - 1 - y < 8)
    const body = new Set<string>()
    for (const [y, row] of data.entries()) {
      for (const [x, on] of row.entries()) {
        if (on && !finder(x, y)) {
          body.add(`${x},${y}`)
        }
      }
    }

    for (const shape of ['dots', 'rounded']) {
      const host = await code(
        `<helix-headless-qr-code shape="${shape}" value="${value}"></helix-headless-qr-code>`,
      )
      const d = svgOf(host).querySelector('[part="modules"]')?.getAttribute('d') ?? ''
      const drawn = new Set(
        [...d.matchAll(/M([\d.]+) ([\d.]+)/g)].map(
          ([, x, y]) => `${Math.floor(Number(x))},${Math.floor(Number(y))}`,
        ),
      )
      expect(drawn).toEqual(body)
    }

    const square = await code(`<helix-headless-qr-code value="${value}"></helix-headless-qr-code>`)
    const d = svgOf(square).querySelector('[part="modules"]')?.getAttribute('d') ?? ''
    const starts = [...d.matchAll(/M(\d+) (\d+)/g)].map(([, x, y]) => `${x},${y}`)
    expect(starts.length).toBeLessThan(body.size)
    expect(starts.every((cell) => body.has(cell))).toBe(true)
  })

  test('the corner squares are their own path, and stay square', async () => {
    /* They are what a scanner locks onto first, so rounding them trades
       reliability for decoration. Separating them is also what lets them take
       a color of their own: one path is one fill. */
    const host = await code(
      '<helix-headless-qr-code shape="dots" value="hello"></helix-headless-qr-code>',
    )
    const finders = svgOf(host).querySelector('[part="finders"]')?.getAttribute('d') ?? ''
    expect(finders).not.toBe('')
    // A run-joined square path uses `h`; an arc-drawn one uses `a`.
    expect(finders).toContain('h')
    expect(finders).not.toContain('a')
  })

  test('the finders are in the three corners the specification puts them', async () => {
    const host = await code('<helix-headless-qr-code value="hello"></helix-headless-qr-code>')
    const size = encode('hello', { border: 0, ecc: 'M' }).size
    const starts = [
      ...(svgOf(host).querySelector('[part="finders"]')?.getAttribute('d') ?? '').matchAll(
        /M(\d+) (\d+)/g,
      ),
    ].map(([, x, y]) => ({ x: Number(x), y: Number(y) }))
    const corner = (one: { x: number; y: number }): boolean =>
      (one.x < 8 && one.y < 8) ||
      (one.x >= size - 8 && one.y < 8) ||
      (one.x < 8 && one.y >= size - 8)
    expect(starts.length).toBeGreaterThan(0)
    expect(starts.every(corner)).toBe(true)
  })

  test('nothing is drawn for nothing, rather than an empty square', async () => {
    const host = await code('<helix-headless-qr-code value=""></helix-headless-qr-code>')
    expect(part(host, 'code')).toBeNull()
  })

  test('a code that changes is re-encoded', async () => {
    const host = await code('<helix-headless-qr-code value="one"></helix-headless-qr-code>')
    const before = svgOf(host).querySelector('path')?.getAttribute('d')
    ;(host as unknown as HTMLElement & { value: string }).value = 'two'
    await host.updateComplete
    expect(svgOf(host).querySelector('path')?.getAttribute('d')).not.toBe(before)
  })
})

/* The center mark needs a real engine: `assignedNodes` is what tells the
   element the slot was filled, and happy-dom does not report it here. */
