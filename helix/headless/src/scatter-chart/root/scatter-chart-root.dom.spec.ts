import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** Revenue that is exactly twice spend, so the relation is as strong as one gets. */
const SPEND = `<table id="spend">
  <caption>Spend and revenue</caption>
  <thead><tr><th scope="col">Campaign</th><th scope="col">Spend</th><th scope="col">Revenue</th></tr></thead>
  <tbody>
    <tr><th scope="row">A</th><td data-value="1">1</td><td data-value="2">2</td></tr>
    <tr><th scope="row">B</th><td data-value="2">2</td><td data-value="4">4</td></tr>
    <tr><th scope="row">C</th><td data-value="3">3</td><td data-value="6">6</td></tr>
    <tr><th scope="row">D</th><td data-value="4">4</td><td data-value="8">8</td></tr>
    <tr><th scope="row">E</th><td data-value="5">5</td><td data-value="10">10</td></tr>
  </tbody>
</table>`

/** Two measures up against one across, and a row missing one of them. */
const LOAD = `<table id="load">
  <thead><tr><th scope="col">Run</th><th scope="col">Rate</th><th scope="col">p50</th><th scope="col">p95</th></tr></thead>
  <tbody>
    <tr><th scope="row">1</th><td data-value="100">100</td><td data-value="10">10</td><td data-value="30">30</td></tr>
    <tr><th scope="row">2</th><td data-value="200">200</td><td data-value="12">12</td><td></td></tr>
    <tr><th scope="row">3</th><td data-value="300">300</td><td data-value="15">15</td><td data-value="60">60</td></tr>
  </tbody>
</table>`

type Chart = HTMLElement & { updateComplete: Promise<unknown> }

const chart = async (table: string, attributes = ''): Promise<Chart> => {
  await mount(
    `<div>${table}<helix-headless-scatter-chart ${attributes}></helix-headless-scatter-chart></div>`,
  )
  const host = document.querySelector('helix-headless-scatter-chart') as Chart
  await host.updateComplete
  return host
}

const all = (host: HTMLElement, name: string): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>(`[part~="${name}"]`) ?? []),
]

const at = (point: HTMLElement, axis: 'x' | 'y'): number =>
  Number.parseFloat(point.style.getPropertyValue(`--chart-point-${axis}`))

describe('points', () => {
  test('the points of the row a pointer is on are a part of their own, and only those', async () => {
    const host = (await chart(SPEND, 'for="spend"')) as Chart & {
      pointer: { set: (at: number) => void }
    }
    const named = (): number[] =>
      all(host, 'point')
        .map((one, index) =>
          (one.getAttribute('part') ?? '').includes('point-active') ? index : -1,
        )
        .filter((index) => index >= 0)
    expect(named()).toEqual([])
    host.pointer.set(2)
    await host.updateComplete
    expect(named()).toEqual([2])
  })

  test('one per row, measured across by the first numeric column and up by the next', async () => {
    const host = await chart(SPEND, 'for="spend"')
    const points = all(host, 'point')
    expect(points).toHaveLength(5)
    expect(points.map((one) => at(one, 'x'))).toEqual([0, 25, 50, 75, 100])
    expect(points.map((one) => at(one, 'y'))).toEqual([100, 75, 50, 25, 0])
  })

  test('every further numeric column is a series against the same across', async () => {
    const host = await chart(LOAD, 'for="load"')
    const series = all(host, 'point').map((one) => one.getAttribute('data-series'))
    /* Three rows of p50 and two of p95: the second run has no p95, and a point
       with one coordinate has nowhere to be. */
    expect(series).toEqual(['1', '1', '1', '2', '2'])
  })

  test('the range is widened to round numbers, so the edges of the plot are ticks', async () => {
    const host = await chart(LOAD, 'for="load"')
    const across = all(host, 'x-tick')
    expect(across[0]?.textContent).toBe('100')
    expect(across.at(-1)?.textContent).toBe('300')
    expect(across.at(-1)?.style.getPropertyValue('--chart-tick')).toBe('100%')
    const up = all(host, 'y-tick')
    expect(up[0]?.style.getPropertyValue('--chart-tick')).toBe('100%')
    expect(up.at(-1)?.style.getPropertyValue('--chart-tick')).toBe('0%')
  })

  test('each axis says what it measures, in the table’s own words', async () => {
    const host = await chart(LOAD, 'for="load"')
    expect(part(host, 'x-name')?.textContent).toBe('Rate')
    expect(part(host, 'y-name')?.textContent).toBe('p50, p95')
  })
})

/* A measure runs left to right in every script, as a number line does, so the
   component holds its plane that way itself and a page's `dir` reaches only the
   words. The pictures of it are in the styled tier's specs. */
describe('which way it reads', () => {
  test('the plane is left to right, with nothing turning it', async () => {
    const host = await chart(SPEND, 'for="spend"')
    const plane = part(host, 'plane')
    expect(plane?.getAttribute('dir')).toBe('ltr')
    for (const name of ['plot', 'x-axis', 'y-axis', 'x-name', 'y-name']) {
      expect(plane?.contains(part(host, name))).toBe(true)
    }
    expect(host.shadowRoot?.querySelector('[data-mirror]')).toBeNull()
  })

  test('an empty chart holds its plot in the same plane', async () => {
    const host = await chart('', 'for="nothing"')
    expect(part(host, 'plane')?.getAttribute('dir')).toBe('ltr')
    expect(part(host, 'plane')?.contains(part(host, 'plot'))).toBe(true)
  })

  test('the names read their own way, and the summary the page’s', async () => {
    const host = await chart(SPEND, 'for="spend"')
    expect(part(host, 'x-name')?.getAttribute('dir')).toBe('auto')
    expect(part(host, 'y-name')?.getAttribute('dir')).toBe('auto')
    expect(part(host, 'plane')?.contains(part(host, 'summary'))).toBe(false)
    expect(part(host, 'summary')?.hasAttribute('dir')).toBe(false)
  })
})

describe('gridlines', () => {
  const rules = async (value: string): Promise<{ down: number; across: number }> => {
    const host = await chart(SPEND, `for="spend" ${value}`)
    const lines = all(host, 'gridline')
    return {
      across: lines.filter((line) => line.getAttribute('y1') === line.getAttribute('y2')).length,
      down: lines.filter((line) => line.getAttribute('x1') === line.getAttribute('x2')).length,
    }
  }

  test('none unless asked for', async () => {
    expect(await rules('')).toEqual({ across: 0, down: 0 })
  })

  test('a bare attribute rules both axes, and each value rules its own', async () => {
    const both = await rules('gridlines')
    expect(both.down).toBeGreaterThan(0)
    expect(both.across).toBeGreaterThan(0)
    expect((await rules('gridlines="x"')).across).toBe(0)
    expect((await rules('gridlines="y"')).down).toBe(0)
  })
})

describe('what a reader is told', () => {
  test('the drawing is hidden and the summary is not', async () => {
    const host = await chart(SPEND, 'for="spend"')
    expect(part(host, 'plot')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(host, 'summary')?.hasAttribute('aria-hidden')).toBe(false)
  })

  test('how strongly each series relates, and how many points it rests on', async () => {
    const host = await chart(SPEND, 'for="spend"')
    expect(part(host, 'summary')?.textContent).toBe(
      'Spend and revenue. Revenue / Spend: 5 points, correlation +1.00.',
    )
  })

  test('no coefficient for fewer than three points, where it would mean nothing', async () => {
    const host = await chart(LOAD, 'for="load" points-label="runs"')
    expect(part(host, 'summary')?.textContent).toBe(
      'p50 / Rate: 3 runs, correlation +0.99; p95 / Rate: 2 runs.',
    )
  })
})
