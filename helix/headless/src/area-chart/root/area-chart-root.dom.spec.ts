import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** The readings in a path, as `[x, y]` pairs: the last pair of each command. */
const anchors = (path: string): Array<[number, number]> =>
  [...path.matchAll(/([MLC])([^MLCHVZ]*)/g)].map((command) => {
    const [x, y] = ((command[2] ?? '').trim().split(/\s+/).at(-1) ?? '').split(',')
    return [Number(x), Number(y)]
  })

/** Three parts over three months, totalling 20, 40 and 50. */
const SOURCES = `<table id="sources">
  <caption>Visits by source</caption>
  <thead><tr><th scope="col">Month</th><th scope="col">Search</th><th scope="col">Direct</th><th scope="col">Social</th></tr></thead>
  <tbody>
    <tr><th scope="row">Jan</th><td data-value="10">10</td><td data-value="6">6</td><td data-value="4">4</td></tr>
    <tr><th scope="row">Feb</th><td data-value="20">20</td><td data-value="12">12</td><td data-value="8">8</td></tr>
    <tr><th scope="row">Mar</th><td data-value="25">25</td><td data-value="15">15</td><td data-value="10">10</td></tr>
  </tbody>
</table>`

type Chart = HTMLElement & {
  pointer: { set: (at: number) => void }
  updateComplete: Promise<unknown>
}

const chart = async (table: string, attributes = ''): Promise<Chart> => {
  await mount(
    `<div>${table}<helix-headless-area-chart ${attributes}></helix-headless-area-chart></div>`,
  )
  const host = document.querySelector('helix-headless-area-chart') as Chart
  await host.updateComplete
  return host
}

const all = (host: HTMLElement, name: string): Element[] => [
  ...(host.shadowRoot?.querySelectorAll(`[part="${name}"]`) ?? []),
]

/* The edges in the order the parts are stacked, bottom first. They are drawn
   top first, so the band below covers the lower part of the one above it. */
const edges = (host: HTMLElement): Array<Array<[number, number]>> =>
  all(host, 'line')
    .map((line) => anchors(line.getAttribute('d') ?? ''))
    .reverse()

describe('stacking', () => {
  test('each part sits on the ones below it, and the top edge is the total', async () => {
    const host = await chart(SOURCES, 'for="sources"')
    const [search, direct, social] = edges(host)
    /* Measured from zero to the largest total, 50, in a drawing 100 tall. */
    expect(search?.map(([, y]) => y)).toEqual([80, 60, 50])
    expect(direct?.map(([, y]) => y)).toEqual([68, 36, 20])
    expect(social?.map(([, y]) => y)).toEqual([60, 20, 0])
  })

  test('draws the widest band first, so each band covers the part of the one above it', async () => {
    const host = await chart(SOURCES, 'for="sources"')
    expect(all(host, 'area').map((area) => area.getAttribute('data-series'))).toEqual([
      '3',
      '2',
      '1',
    ])
  })

  test('is straight between readings unless a curve is asked for', async () => {
    const host = await chart(SOURCES, 'for="sources"')
    expect(all(host, 'line').every((line) => !line.getAttribute('d')?.includes('C'))).toBe(true)
    const smooth = await chart(SOURCES, 'for="sources" curve="smooth"')
    expect(all(smooth, 'line').some((line) => line.getAttribute('d')?.includes('C'))).toBe(true)
  })

  /* Web Awesome Pro's area chart draws its series overlapping; this one could
     only stack them, so no part could be compared with another by height. */
  test('`overlap` draws each band from zero, its height its own amount, the scale fit to the largest', async () => {
    const host = await chart(SOURCES, 'for="sources" overlap')
    const [search, direct, social] = edges(host)
    /* Measured from zero to the largest part, Search's 25. */
    expect(search?.map(([, y]) => y)).toEqual([60, 20, 0])
    expect(direct?.map(([, y]) => y)).toEqual([76, 52, 40])
    expect(social?.map(([, y]) => y)).toEqual([84, 68, 60])
  })

  test('`share` draws every reading as the whole, so the top edge is flat', async () => {
    const host = await chart(SOURCES, 'for="sources" share')
    const top = edges(host).at(-1)
    expect(top?.map(([, y]) => y)).toEqual([0, 0, 0])
    /* Search is half of every month, so its edge sits halfway up throughout. */
    expect(edges(host)[0]?.map(([, y]) => y)).toEqual([50, 50, 50])
  })

  test('a blank cell is none of that part, and every later reading stays in its month', async () => {
    const gap = `<table id="gap">
      <thead><tr><th scope="col">Month</th><th scope="col">A</th><th scope="col">B</th></tr></thead>
      <tbody>
        <tr><th scope="row">Jan</th><td data-value="10">10</td><td data-value="10">10</td></tr>
        <tr><th scope="row">Feb</th><td></td><td data-value="20">20</td></tr>
        <tr><th scope="row">Mar</th><td data-value="10">10</td><td data-value="10">10</td></tr>
      </tbody>
    </table>`
    const host = await chart(gap, 'for="gap"')
    const [a, b] = edges(host)
    expect(a?.map(([, y]) => y)).toEqual([50, 100, 50])
    expect(b?.map(([, y]) => y)).toEqual([0, 0, 0])
  })

  test('a negative reading is drawn as none, and says so once', async () => {
    const said: string[] = []
    const original = console.warn
    console.warn = (message: string) => said.push(message)
    const minus = `<table id="minus">
      <thead><tr><th scope="col">Month</th><th scope="col">A</th><th scope="col">B</th></tr></thead>
      <tbody>
        <tr><th scope="row">Jan</th><td data-value="-5">-5</td><td data-value="10">10</td></tr>
        <tr><th scope="row">Feb</th><td data-value="-5">-5</td><td data-value="10">10</td></tr>
      </tbody>
    </table>`
    try {
      const host = await chart(minus, 'for="minus"')
      expect(edges(host)[0]?.map(([, y]) => y)).toEqual([100, 100])
      expect(said).toHaveLength(1)
    } finally {
      console.warn = original
    }
  })

  test('rules the levels over the bands, leaving the floor to the baseline', async () => {
    const host = await chart(SOURCES, 'for="sources" gridlines')
    const ys = all(host, 'gridline').map((line) => Number(line.getAttribute('y1')))
    expect(ys.length).toBeGreaterThan(0)
    expect(ys).not.toContain(100)
    expect(part(host, 'baseline')?.getAttribute('y1')).toBe('100')
  })
})

describe('what a reader is told', () => {
  test('the drawing is hidden and the summary is not', async () => {
    const host = await chart(SOURCES, 'for="sources"')
    expect(part(host, 'svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(host, 'summary')?.hasAttribute('aria-hidden')).toBe(false)
    expect(part(host, 'plot')?.getAttribute('aria-describedby')).toBe('helix-chart-summary')
  })

  test('the summary is the latest total and each part’s share of it', async () => {
    const host = await chart(SOURCES, 'for="sources"')
    expect(part(host, 'summary')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Visits by source, Mar: Total 50; Search 50%, Direct 30%, Social 20%.',
    )
  })

  /* The percentages and the total were written in the runtime's locale, with
     no way to ask for the page's. */
  test('and its numbers are written in `locale`', async () => {
    const host = await chart(SOURCES, 'for="sources" locale="fr"')
    const share = new Intl.NumberFormat('fr', { maximumFractionDigits: 0, style: 'percent' })
    expect(part(host, 'summary')?.textContent?.replace(/\s+/g, ' ')).toContain(
      `Search ${share.format(0.5)}`.replace(/\s+/g, ' '),
    )
  })

  test('the tooltip adds the total, and with `share` each part’s share', async () => {
    const host = await chart(SOURCES, 'for="sources" share total-label="All visits"')
    host.pointer.set(1)
    await host.updateComplete
    const cells = all(host, 'tooltip-cell').map((cell) =>
      cell.textContent?.replace(/\s+/g, ' ').trim(),
    )
    expect(cells).toEqual(['Search 20 (50%)', 'Direct 12 (30%)', 'Social 8 (20%)', 'All visits 40'])
    /* The total is the sum of the bands, not a band, so it takes no color. */
    expect(all(host, 'tooltip-cell').at(-1)?.hasAttribute('data-series')).toBe(false)
  })

  /* A cell's place in its row is its place in the table, and the series are the
     columns that parsed. `readSeries` drops a column of notes and `readRows`
     keeps it, so counted from the cell index every figure after one moved a
     color along: a band drawn in the second series named in the bubble as the
     third, beside a legend calling the third something else. */
  test('a cell wears the color of the band it is in, past a column nothing plotted', async () => {
    const noted = `<table id="noted">
      <thead><tr>
        <th scope="col">Month</th><th scope="col">Search</th>
        <th scope="col">Note</th><th scope="col">Direct</th>
      </tr></thead>
      <tbody>
        <tr><th scope="row">Jan</th><td data-value="10">10</td><td>Launch</td><td data-value="6">6</td></tr>
        <tr><th scope="row">Feb</th><td data-value="20">20</td><td>&mdash;</td><td data-value="12">12</td></tr>
      </tbody>
    </table>`
    const host = await chart(noted, 'for="noted"')
    host.pointer.set(0)
    await host.updateComplete
    expect(all(host, 'tooltip-cell').map((cell) => cell.getAttribute('data-series'))).toEqual([
      '1',
      null,
      '2',
      null,
    ])
    expect(all(host, 'area').map((band) => band.getAttribute('data-series'))).toEqual(['2', '1'])
  })
})

describe('reading by key', () => {
  test('the readout says the reading with its total, as the tooltip does', async () => {
    const host = await chart(SOURCES, 'for="sources"')
    part(host, 'plot')?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'End' }),
    )
    await (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    expect(part(host, 'live')?.textContent).toBe(
      'Mar: Search 25, Direct 15, Social 10, Total 50 (3 of 3)',
    )
  })
})

/* A band a legend hid is not drawn, so the series keys pass over it. */
describe('a band a legend hid', () => {
  test('is passed over by the series keys', async () => {
    await import('../../legend/index.js')
    const host = await chart(
      `${SOURCES}<helix-headless-legend for="sources" hidden-series="Search"></helix-headless-legend>`,
      'for="sources"',
    )
    const legend = document.querySelector('helix-headless-legend') as unknown as Chart
    await legend.updateComplete
    await host.updateComplete
    for (const key of ['ArrowRight', 'ArrowDown']) {
      part(host, 'plot')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
    }
    await host.updateComplete
    expect(part(host, 'live')?.textContent).toBe('Jan, Direct 6 (1 of 3)')
  })
})
