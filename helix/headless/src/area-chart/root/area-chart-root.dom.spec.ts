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

  /* A space alone between two bindings is a text node of its own, which
     Chromium's description computation drops: the summary was read as
     "Total50". The words are one text node. */
  test('the summary is one run of text, so its description keeps its spaces', async () => {
    const host = await chart(SOURCES, 'for="sources"')
    const text = [...(part(host, 'summary')?.childNodes ?? [])].filter(
      (node) => node.nodeType === 3 && (node.textContent ?? '') !== '',
    )
    expect(text.map((node) => node.textContent)).toEqual([
      'Visits by source, Mar: Total 50; Search 50%, Direct 30%, Social 20%.',
    ])
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

/* A page could not hear which reading a reader was on, or that one was pressed. */
describe('the reading, heard by the page', () => {
  test('is sent as it moves, and when Enter presses it', async () => {
    const host = (await chart(SOURCES, 'for="sources"')) as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    const heard: string[] = []
    for (const name of ['helix-reading-change', 'helix-reading-press']) {
      host.addEventListener(name, (event) => {
        const { index, label, pointerType } = (event as CustomEvent).detail
        heard.push(`${name} ${index} ${label} ${pointerType}`)
      })
    }
    const key = (name: string): void => {
      part(host, 'plot')?.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          key: name,
        }),
      )
    }
    key('End')
    await host.updateComplete
    key('Enter')
    const at = heard[0]?.split(' ')[1] ?? ''
    expect(heard).toEqual([
      `helix-reading-change ${at} Mar keyboard`,
      `helix-reading-press ${at} Mar keyboard`,
    ])
  })
})

/* A reading could be measured only from the tooltip: the drawing had no numbers
   beside it. */
describe('value-axis', () => {
  const ticks = (host: HTMLElement): string[] =>
    [...(host.shadowRoot?.querySelectorAll('[part="tick"]') ?? [])].map(
      (one) => one.textContent ?? '',
    )

  test("draws the scale's numbers beside the plot, at the levels the grid rules", async () => {
    const host = await chart(SOURCES, 'for="sources" value-axis')
    expect(part(host, 'axis')?.getAttribute('aria-hidden')).toBe('true')
    expect(ticks(host)).toEqual(['0', '10', '20', '30', '40', '50'])
  })

  test('absent draws none', async () => {
    const host = await chart(SOURCES, 'for="sources"')
    expect(part(host, 'axis')).toBeNull()
  })
})

/* An empty table drew a blank plot at full height, which reads as a chart that
   failed, and a chart waiting for its readings drew the same. */
describe('with nothing to draw', () => {
  const EMPTY = `<table id="none"><thead><tr><th scope="col">Month</th><th scope="col">Sessions</th></tr></thead><tbody></tbody></table>`
  const FULL = `<table id="some"><thead><tr><th scope="col">Month</th><th scope="col">Sessions</th></tr></thead><tbody><tr><th scope="row">Jan</th><td>3</td></tr><tr><th scope="row">Feb</th><td>5</td></tr></tbody></table>`

  const host = async (table: string, attributes: string, inside = ''): Promise<HTMLElement> => {
    await mount(
      `<div>${table}<helix-headless-area-chart ${attributes}>${inside}</helix-headless-area-chart></div>`,
    )
    const chart = document.querySelector('helix-headless-area-chart') as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await chart.updateComplete
    await chart.updateComplete
    return chart
  }

  test('says it has no readings, in words a page can set or slot', async () => {
    const chart = await host(EMPTY, 'for="none"')
    const empty = part(chart, 'empty')
    expect(empty?.closest('[part~="plot"]')).not.toBeNull()
    expect(empty?.textContent?.trim()).toBe('No readings')
    const worded = await host(EMPTY, 'for="none" empty-text="Nothing sold yet"')
    expect(part(worded, 'empty')?.textContent?.trim()).toBe('Nothing sold yet')
    const linked = await host(EMPTY, 'for="none"', '<a slot="empty" href="#add">Add a reading</a>')
    const slot = part(linked, 'empty')?.querySelector('slot[name="empty"]') as HTMLSlotElement
    expect(slot.assignedElements().map((one) => one.textContent)).toEqual(['Add a reading'])
  })

  test('says it is loading while loading is set, and keeps drawing readings it has', async () => {
    const waiting = await host(EMPTY, 'for="none" loading')
    expect(part(waiting, 'empty')).toBeNull()
    expect(part(waiting, 'loading')?.textContent?.trim()).toBe('Loading readings')
    const refreshing = await host(FULL, 'for="some" loading')
    expect(part(refreshing, 'loading')).toBeNull()
    expect(part(refreshing, 'svg') ?? part(refreshing, 'plot')?.querySelector('svg')).not.toBeNull()
  })
})

/* A chart read only a table by id, where a page whose numbers arrive as data
   had to write a table to draw one. */
describe('from data', () => {
  const DATA = {
    caption: 'Sessions by channel',
    columns: ['Month', 'Direct', 'Referral'],
    rows: [
      ['Jan', 10, 4],
      ['Feb', 20, 8],
      ['Mar', 15, 6],
    ],
  }

  test('draws the readings, named by the caption, where no table is named', async () => {
    const chart = (await mount(
      '<helix-headless-area-chart></helix-headless-area-chart>',
    )) as HTMLElement & {
      data: unknown
      readings: number
      updateComplete: Promise<boolean>
    }
    chart.data = DATA
    await chart.updateComplete
    expect(chart.readings).toBe(3)
    expect(part(chart, 'plot')?.getAttribute('aria-label')).toBe('Sessions by channel')
    expect(part(chart, 'summary')?.textContent).toContain('Sessions by channel')
    expect(part(chart, 'empty')).toBeNull()
    chart.data = { columns: ['Month', 'Direct', 'Referral'], rows: [] }
    await chart.updateComplete
    expect(part(chart, 'empty')?.textContent?.trim()).toBe('No readings')
  })

  /* An array of rows in place of `{ columns, rows }` threw from the render,
     and the page said nothing about why. */
  test('of the wrong shape draws the empty state and warns in development', async () => {
    const warnings: string[] = []
    const warn = console.warn
    console.warn = (message: string) => warnings.push(String(message))
    try {
      const chart = (await mount(
        '<helix-headless-area-chart label="Sessions"></helix-headless-area-chart>',
      )) as HTMLElement & { data: unknown; readings: number; updateComplete: Promise<boolean> }
      for (const wrong of [
        [
          ['Month', 'Search'],
          ['Jan', 10],
        ],
        { columns: ['Month', 'Search'] },
        { columns: ['Month', 'Search'], rows: ['Jan', 10] },
      ]) {
        chart.data = wrong
        await chart.updateComplete
        expect(chart.readings).toBe(0)
        expect(part(chart, 'empty')?.textContent?.trim()).toBe('No readings')
      }
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('{ columns, rows }')
    } finally {
      console.warn = warn
    }
  })

  /* Drawn from data, a chart had no table on the page for a screen reader to
     read, and its summary gives only what the readings come to. */
  test('renders the readings as a table, and none where a table on the page was read', async () => {
    const chart = (await mount(
      '<helix-headless-area-chart></helix-headless-area-chart>',
    )) as HTMLElement & { data: unknown; updateComplete: Promise<boolean> }
    chart.data = DATA
    await chart.updateComplete
    const table = part(chart, 'table')
    expect(table?.querySelector('caption')?.textContent).toBe('Sessions by channel')
    expect(
      [...(table?.querySelectorAll('th[scope="col"]') ?? [])].map((th) => th.textContent),
    ).toEqual(['Month', 'Direct', 'Referral'])
    expect(
      [...(table?.querySelectorAll('tbody tr') ?? [])].map((tr) =>
        [...tr.children].map((cell) => cell.textContent),
      ),
    ).toEqual([
      ['Jan', '10', '4'],
      ['Feb', '20', '8'],
      ['Mar', '15', '6'],
    ])
    await mount(
      `<div><table id="t"><thead><tr><th>Month</th><th>Direct</th></tr></thead><tbody><tr><th>Jan</th><td>3</td></tr></tbody></table><helix-headless-area-chart for="t"></helix-headless-area-chart></div>`,
    )
    const read = document.querySelector('helix-headless-area-chart') as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await read.updateComplete
    expect(part(read, 'table')).toBeNull()
  })

  test('a table named by for wins over data', async () => {
    await mount(
      `<div><table id="t"><caption>From the table</caption><thead><tr><th>Month</th><th>Direct</th></tr></thead><tbody><tr><th>Jan</th><td>3</td></tr></tbody></table><helix-headless-area-chart for="t"></helix-headless-area-chart></div>`,
    )
    const chart = document.querySelector('helix-headless-area-chart') as HTMLElement & {
      data: unknown
      readings: number
      updateComplete: Promise<boolean>
    }
    chart.data = DATA
    await chart.updateComplete
    expect(chart.readings).toBe(1)
    expect(part(chart, 'plot')?.getAttribute('aria-label')).toBe('From the table')
  })
})
