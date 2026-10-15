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

/* A week with today lit, as Switchyard's chart of runs draws it. */
const week = `<table id="week" data-hidden-visually>
  <caption>Runs per day</caption>
  <thead><tr><th>Day</th><th>Runs</th></tr></thead>
  <tbody>
    <tr><th scope="row">Mon</th><td data-value="59800">59,800</td></tr>
    <tr><th scope="row">Tue</th><td data-tone="primary" data-value="64200">64,200</td></tr>
    <tr><th scope="row">Wed</th><td data-value="61900">61,900</td></tr>
  </tbody>
</table>`

const days = async (attributes = '') => {
  const host = (await mount(
    `<div>${week}<helix-headless-spatial-bar-chart for="week" ${attributes}></helix-headless-spatial-bar-chart></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-bar-chart') as Plot
  await element.updateComplete
  return element
}

const all = (element: HTMLElement, name: string): Element[] => [
  ...(element.shadowRoot?.querySelectorAll(`[part="${name}"]`) ?? []),
]

describe('a toned bar', () => {
  test('takes its tone, falling back to its series, and the others their series', async () => {
    const element = await days()
    const toned = bars(element).filter((bar) => bar.getAttribute('data-tone') === 'primary')
    expect(toned).toHaveLength(1)
    expect(toned[0]?.getAttribute('style')).toBe(
      '--chart-series: var(--spatial-bar-chart-tone-primary, var(--chart-series-1))',
    )
    expect(bars(element).filter((bar) => bar.hasAttribute('data-tone'))).toHaveLength(1)
  })

  test('writes its value over it as the table writes it, and no other value', async () => {
    const element = await days()
    expect(all(element, 'value').map((value) => value.textContent)).toEqual(['64,200'])
  })

  test('refuses a tone that is not a name', async () => {
    const host = (await mount(
      `<div>${week.replace('data-tone="primary"', 'data-tone="red;fill:red"')}<helix-headless-spatial-bar-chart for="week"></helix-headless-spatial-bar-chart></div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-spatial-bar-chart') as Plot
    await element.updateComplete
    expect(bars(element).filter((bar) => bar.hasAttribute('data-tone'))).toHaveLength(0)
    expect(all(element, 'value')).toHaveLength(0)
  })
})

describe('a row', () => {
  test('draws its floor, a plate for each day, and the days under it, the toned one in its tone', async () => {
    const element = await days('variant="row"')
    expect(all(element, 'floor')).toHaveLength(3)
    const names = all(element, 'tick')
    expect(names.map((name) => name.textContent)).toEqual(['Mon', 'Tue', 'Wed'])
    expect(names[1]?.getAttribute('data-tone')).toBe('primary')
    expect(part(element, 'grid')).toBeNull()
  })

  test('with no box, draws the bars and the lit value alone', async () => {
    const element = await days('variant="row" no-box')
    expect(all(element, 'floor')).toHaveLength(0)
    expect(all(element, 'tick')).toHaveLength(0)
    expect(all(element, 'value')).toHaveLength(1)
  })

  test('a diagonal draws its floor and names climbing to the right', async () => {
    const element = await days('variant="diagonal"')
    expect(all(element, 'floor')).toHaveLength(3)
    const names = all(element, 'tick')
    expect(names.map((name) => name.textContent)).toEqual(['Mon', 'Tue', 'Wed'])
    const at = names.map((name) => [Number(name.getAttribute('x')), Number(name.getAttribute('y'))])
    expect(at[1]?.[0]).toBeGreaterThan(at[0]?.[0] ?? 0)
    expect(at[1]?.[1]).toBeLessThan(at[0]?.[1] ?? 0)
    expect(part(element, 'grid')).toBeNull()
  })

  test('says how many bars fit only where a row is measured with a bar size', async () => {
    /* No layout here, so nothing is measured and the page shows every row. */
    const element = (await days('variant="diagonal"')) as Plot & { fits?: number }
    element.style.setProperty('--spatial-bar-chart-bar-size', '18px')
    expect(element.fits).toBeUndefined()
    const grid = (await days()) as Plot & { fits?: number }
    expect(grid.fits).toBeUndefined()
  })
})

/* The bubble over a 3D bar sits over the middle of its top and says what
   the table says, "64,200" and not "64200". */
describe('the tooltip', () => {
  test('is centered on the bar and points at the top of its outline', async () => {
    const element = await days('variant="diagonal"')
    element.requestActive(1)
    await element.updateComplete
    const anchor = element.shadowRoot?.querySelector('foreignObject')
    const ring = part(element, 'ring')?.getAttribute('d') ?? ''
    const ys = [...ring.matchAll(/-?\d*\.?\d+(?:e-?\d+)?/g)]
      .map((match) => Number(match[0]))
      .filter((_, at) => at % 2 === 1)
    expect(Number(anchor?.getAttribute('y'))).toBeCloseTo(Math.min(...ys), 3)
    const top = bars(element)
      .find((bar) => bar.getAttribute('data-index') === '1')
      ?.querySelectorAll('[part="face"]')
    const face = top?.[top.length - 1]?.getAttribute('d') ?? ''
    const xs = [...face.matchAll(/-?\d*\.?\d+(?:e-?\d+)?/g)]
      .map((match) => Number(match[0]))
      .filter((_, at) => at % 2 === 0)
    expect(Number(anchor?.getAttribute('x'))).toBeCloseTo(
      xs.reduce((sum, x) => sum + x, 0) / xs.length,
      3,
    )
  })

  test("shows the cell's own text, as the page wrote it", async () => {
    const element = await days('variant="diagonal"')
    element.requestActive(1)
    await element.updateComplete
    const value = element.shadowRoot?.querySelector('[part="tooltip-value"]')
    expect(value?.textContent).toBe('64,200')
  })
})

describe('growing in', () => {
  const faces = (element: HTMLElement): number[] =>
    bars(element).map((bar) => bar.querySelectorAll('[part="face"]').length)

  test('waits flat on the floor until the chart is seen', async () => {
    const element = await days('grow variant="row"')
    /* No side is drawn on a bar with no height, only its top. */
    expect(faces(element)).toEqual([1, 1, 1])
  })

  test('stands at its height at once where the page has paused its motion', async () => {
    document.documentElement.setAttribute('data-helix-motion', 'paused')
    try {
      const element = await days('grow variant="row"')
      expect(faces(element)).toEqual([3, 3, 3])
    } finally {
      document.documentElement.removeAttribute('data-helix-motion')
    }
  })

  test('without grow, the bars stand at their height', async () => {
    const element = await days('variant="row"')
    expect(faces(element)).toEqual([3, 3, 3])
  })
})
