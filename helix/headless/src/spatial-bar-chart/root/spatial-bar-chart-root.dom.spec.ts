import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The frame, after hydration. The table's reading is held by
 * `bars.pure.spec.ts`; what is here is what the frame publishes for a
 * renderer, what it draws until one has, and the keys. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Plot extends HTMLElement {
  active: number
  field: { categories: string[]; cells: { value?: number }[]; series: string[] }
  rendererDrawn(on?: boolean): void
  requestActive(index: number, kind?: 'mouse' | 'pen' | 'touch'): void
  updateComplete: Promise<unknown>
}

/* Three regions over two quarters, with no figure for the West's second. */
const table = `<table id="signups" data-hidden-visually>
  <caption>Signups</caption>
  <thead><tr><th>Region</th><th>Q1</th><th>Q2</th></tr></thead>
  <tbody>
    <tr><th scope="row">North</th><td>420</td><td>465</td></tr>
    <tr><th scope="row">South</th><td>310</td><td>355</td></tr>
    <tr><th scope="row">West</th><td>260</td><td></td></tr>
  </tbody>
</table>`

const plot = async () => {
  const host = (await mount(
    `<div>${table}<helix-headless-spatial-bar-chart for="signups"><div class="box"></div></helix-headless-spatial-bar-chart></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-bar-chart') as Plot
  await element.updateComplete
  return element
}

const key = (element: HTMLElement, name: string, shiftKey = false) =>
  part(element, 'plot')?.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: name,
      shiftKey,
    }),
  )

const bars = (element: HTMLElement): Element[] => [
  ...(element.shadowRoot?.querySelectorAll('[part~="bar"]') ?? []),
]

describe('the frame', () => {
  test('publishes the bars for a renderer, a category across and a series in depth', async () => {
    const element = await plot()
    expect(element.field.categories).toEqual(['North', 'South', 'West'])
    expect(element.field.series).toEqual(['Q1', 'Q2'])
    expect(element.field.cells.map((cell) => cell.value)).toEqual([
      420,
      465,
      310,
      355,
      260,
      undefined,
    ])
  })

  test('draws a bar for each figure in its series color until a renderer has drawn', async () => {
    const element = await plot()
    expect(part(element, 'drawing')?.localName).toBe('svg')
    expect(bars(element)).toHaveLength(5)
    const series = bars(element).map(
      (bar) => /--chart-series-(\d+)/.exec(bar.getAttribute('style') ?? '')?.[1],
    )
    expect(new Set(series)).toEqual(new Set(['1', '2']))
    for (const face of element.shadowRoot?.querySelectorAll('[part="face"]') ?? []) {
      expect(face.getAttribute('style')).toMatch(/--spatial-bar-chart-shade: [\d.]+/)
    }
    element.rendererDrawn()
    await element.updateComplete
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(true)
  })

  test('the bars are painted back to front, so the first series, in front, comes after the second', async () => {
    const element = await plot()
    const order = bars(element).map((bar) => Number(bar.getAttribute('data-index')))
    /* North's Q2 bar stands behind its Q1 bar. */
    expect(order.indexOf(1)).toBeLessThan(order.indexOf(0))
  })

  test('with no box, draws the bars alone, framed around them, and still says every value', async () => {
    const element = await plot()
    const boxed = part(element, 'drawing')?.getAttribute('viewBox')?.split(' ').map(Number) ?? []
    element.setAttribute('no-box', '')
    await element.updateComplete
    expect(part(element, 'grid')).toBeNull()
    expect(element.shadowRoot?.querySelectorAll('[part="tick"], [part="axis-name"]')).toHaveLength(
      0,
    )
    expect(bars(element)).toHaveLength(5)
    const bare = part(element, 'drawing')?.getAttribute('viewBox')?.split(' ').map(Number) ?? []
    /* Narrower and lower than a frame that holds the box and its names. */
    expect(bare[2]).toBeLessThan(boxed[2] as number)
    expect(bare[3]).toBeLessThan(boxed[3] as number)
    expect(part(element, 'summary')?.textContent).toContain('5 bars')
  })

  test('says what it shows in a sentence', async () => {
    const element = await plot()
    expect(part(element, 'summary')?.textContent).toBe(
      '5 bars in 2 series over 3 categories, from 260 to 465.',
    )
  })
})

describe('the keys', () => {
  test('right moves to the next category, and down to the next series', async () => {
    const element = await plot()
    key(element, 'Home')
    await element.updateComplete
    expect(element.active).toBe(0)
    key(element, 'ArrowRight')
    await element.updateComplete
    expect(element.active).toBe(2)
    key(element, 'ArrowDown')
    await element.updateComplete
    expect(element.active).toBe(3)
    expect(part(element, 'live')?.textContent).toContain('South')
    expect(part(element, 'live')?.textContent).toContain('Q2')
  })

  test('a place with no figure is said as such, and is no reading', async () => {
    const element = await plot()
    const told: number[] = []
    element.addEventListener('helix-reading-change', (event) =>
      told.push((event as CustomEvent).detail.index),
    )
    key(element, 'End')
    await element.updateComplete
    expect(part(element, 'live')?.textContent).toBe('West, Q2: no value')
    expect(told.at(-1)).toBe(-1)
  })

  test('Shift with an arrow turns the view and moves no reading', async () => {
    const element = await plot()
    const turns: unknown[] = []
    element.addEventListener('helix-plot-turn', (event) =>
      turns.push((event as CustomEvent).detail),
    )
    const before = part(element, 'grid')?.getAttribute('d')
    key(element, 'ArrowRight', true)
    await element.updateComplete
    expect(turns).toEqual([{ across: 1, up: 0 }])
    expect(part(element, 'grid')?.getAttribute('d')).not.toBe(before)
    expect(element.active).toBe(-1)
  })
})

describe('the pointer', () => {
  test('a mouse over a bar puts the reading on it, and the bar is outlined', async () => {
    const element = await plot()
    const bar = bars(element).find((one) => one.getAttribute('data-index') === '2') as Element
    bar.firstElementChild?.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, composed: true, pointerType: 'mouse' }),
    )
    await element.updateComplete
    expect(element.active).toBe(2)
    expect(part(element, 'ring')?.getAttribute('d')).toMatch(/^M/)
  })

  test('the outline is painted straight after its bar, so the bars in front cover it', async () => {
    const element = await plot()
    element.requestActive(0)
    await element.updateComplete
    const ring = part(element, 'ring')
    expect(ring?.previousElementSibling?.getAttribute('data-index')).toBe('0')
    /* The first bar stands in front, so bars are painted after its outline. */
    expect(ring?.nextElementSibling?.getAttribute('part')).toContain('bar')
    /* And again over every bar, dashed, where the ones in front hide it. */
    const behind = part(element, 'ring-behind')
    expect(behind?.getAttribute('d')).toBe(ring?.getAttribute('d') ?? '')
    expect(behind?.nextElementSibling?.localName).toBe('foreignObject')
  })
})
