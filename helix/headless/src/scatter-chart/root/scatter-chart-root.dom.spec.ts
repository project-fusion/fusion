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

/**
 * Every point drawn, in the order drawn: where it is, the series its group
 * says, and the weight its path carries. A point is a stroke of no length in
 * a `point` path.
 */
const dots = (host: HTMLElement): Array<{ series: string; weight: string; x: number; y: number }> =>
  all(host, 'point').flatMap((path) =>
    [...(path.getAttribute('d') ?? '').matchAll(/M([^,]+),([^h]+)h0/g)].map((dot) => ({
      series: path.closest('[part="points"]')?.getAttribute('data-series') ?? '',
      weight: path.style.getPropertyValue('--chart-point-weight').trim() || 'none',
      x: Number(dot[1]),
      y: Number(dot[2]),
    })),
  )

describe('points', () => {
  test('the points of the row a pointer is on are drawn again, and only those', async () => {
    const host = (await chart(SPEND, 'for="spend"')) as Chart & {
      pointer: { set: (at: number) => void }
    }
    expect(all(host, 'point-active')).toEqual([])
    host.pointer.set(2)
    await host.updateComplete
    const [active, ...more] = all(host, 'point-active')
    expect(more).toEqual([])
    expect([at(active as HTMLElement, 'x'), at(active as HTMLElement, 'y')]).toEqual([50, 50])
    expect(active?.getAttribute('data-series')).toBe('1')
  })

  test('one per row, measured across by the first numeric column and up by the next', async () => {
    const host = await chart(SPEND, 'for="spend"')
    const points = dots(host)
    expect(points).toHaveLength(5)
    expect(points.map((one) => one.x)).toEqual([0, 25, 50, 75, 100])
    expect(points.map((one) => one.y)).toEqual([100, 75, 50, 25, 0])
  })

  test('every further numeric column is a series against the same across', async () => {
    const host = await chart(LOAD, 'for="load"')
    /* Three rows of p50 and two of p95: the second run has no p95, and a point
       with one coordinate has nowhere to be. */
    expect(dots(host).map((one) => one.series)).toEqual(['1', '1', '1', '2', '2'])
  })

  /* An element a point cost 10,832 nodes for 10,000 rows. */
  test('draws a series in a path, under a path of its rings, in a group of its color', async () => {
    const host = await chart(LOAD, 'for="load"')
    const groups = all(host, 'points')
    expect(groups.map((one) => one.getAttribute('data-series'))).toEqual(['1', '2'])
    expect(groups[1]?.getAttribute('style')).toContain('--chart-series: var(--chart-series-2)')
    expect([...(groups[0]?.children ?? [])].map((one) => one.getAttribute('part'))).toEqual([
      'point-ring',
      'point',
    ])
    const [ring, point] = [...(groups[0]?.children ?? [])]
    expect(ring?.getAttribute('d')).toBe(point?.getAttribute('d'))
  })

  /* The scale guard: what a chart builds is bounded by what it can show, and
     not by how many rows it was given. */
  test('builds as many elements for 20,000 rows as for 2,000', async () => {
    const count = async (rows: number): Promise<number> => {
      const host = (await mount(
        '<helix-headless-scatter-chart gridlines trend></helix-headless-scatter-chart>',
      )) as HTMLElement & { data: unknown; updateComplete: Promise<boolean> }
      host.data = {
        columns: ['At', 'Rate', 'p50', 'p95'],
        rows: Array.from({ length: rows }, (_, at) => [`r${at}`, at % 97, at % 13, (at * 7) % 31]),
      }
      await host.updateComplete
      return host.shadowRoot?.querySelectorAll('*').length ?? 0
    }
    const few = await count(2000)
    expect(few).toBeLessThan(2000)
    expect(await count(20_000)).toBe(few)
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

  /* The label at the far end was centered on the plot's right edge, so half of
     it hung past the chart and was cut off by the box around it. */
  test('the label at the far end across is marked, so it can end at the edge', async () => {
    const host = await chart(LOAD, 'for="load"')
    const across = all(host, 'x-tick')
    expect(across.map((one) => one.getAttribute('data-edge'))).toEqual([
      ...across.slice(0, -1).map(() => null),
      'end',
    ])
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
    expect(part(host, 'svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(host, 'summary')?.hasAttribute('aria-hidden')).toBe(false)
    expect(part(host, 'plot')?.getAttribute('aria-label')).toBe('Spend and revenue')
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

describe('the tooltip', () => {
  /* A scatter's first plotted series is the table's *second* numeric column,
     the across having been split off the front. Colored by cell index the
     bubble painted the across column in series one, the color the points
     themselves are drawn in, and gave the series actually plotted series two. */
  test('keys each cell to the series the points are drawn in, not to its column', async () => {
    const host = (await chart(LOAD, 'for="load"')) as Chart & {
      seriesOf: (cell: number) => number | undefined
    }
    expect([0, 1, 2].map((cell) => host.seriesOf(cell))).toEqual([undefined, 1, 2])
    expect(dots(host).map((one) => one.series)).toEqual(['1', '1', '1', '2', '2'])
  })

  test('the measure across gets no dot, being an axis rather than a series', async () => {
    const host = (await chart(LOAD, 'for="load"')) as Chart & {
      seriesOf: (cell: number) => number | undefined
    }
    expect(host.seriesOf(0)).toBeUndefined()
  })
})

describe('reading by key', () => {
  test("the arrows walk the rows, and the tooltip sits on that row's point", async () => {
    const host = await chart(SPEND, 'for="spend"')
    part(host, 'plot')?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'End' }),
    )
    await (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    expect(part(host, 'live')?.textContent).toBe('E: Spend 5, Revenue 10 (5 of 5)')
    expect(part(host, 'tooltip-label')?.textContent).toBe('E')
    expect(part(host, 'point-active')).not.toBeNull()
  })

  /* The arrows walked the table's rows, so a table out of order sent a reader
     back and forth across the plane. */
  test('the arrows walk the points from left to right, whatever order the table is in', async () => {
    const MIXED = `<table id="mixed"><tbody>
      <tr><th>C</th><td>30</td><td>1</td></tr>
      <tr><th>A</th><td>10</td><td>2</td></tr>
      <tr><th>B</th><td>20</td><td>3</td></tr>
    </tbody></table>`
    const host = (await chart(MIXED, 'for="mixed"')) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    const said: string[] = []
    for (const key of ['Home', 'ArrowRight', 'ArrowRight']) {
      part(host, 'plot')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
      await host.updateComplete
      said.push(part(host, 'tooltip-label')?.textContent ?? '')
    }
    expect(said).toEqual(['A', 'B', 'C'])
    expect(part(host, 'live')?.textContent).toContain('(3 of 3)')
  })

  /* The plane is drawn left to right on every page, and the arrows followed the
     page: on a right-to-left page Right did nothing from the first point and
     Left moved to the point drawn on its right. */
  test('the arrows follow the drawing on a right-to-left page', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    try {
      const host = (await chart(SPEND, 'for="spend"')) as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      const said: string[] = []
      for (const key of ['Home', 'ArrowRight', 'ArrowRight', 'ArrowLeft']) {
        part(host, 'plot')?.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
        )
        await host.updateComplete
        said.push(part(host, 'tooltip-label')?.textContent ?? '')
      }
      expect(said).toEqual(['A', 'B', 'C', 'B'])
    } finally {
      document.documentElement.removeAttribute('dir')
    }
  })
})

describe('trend', () => {
  const trends = (host: HTMLElement): Element[] => [
    ...(host.shadowRoot?.querySelectorAll('[part="trend"]') ?? []),
  ]

  test('absent draws no line of best fit', async () => {
    expect(trends(await chart(SPEND, 'for="spend"'))).toHaveLength(0)
  })

  /* Revenue is twice spend, so the line runs corner to corner of a plot whose
     range is the round numbers around the points. */
  test('draws each series its line of best fit, across the plot, in its color', async () => {
    const host = await chart(LOAD, 'for="load" trend')
    const lines = trends(host)
    expect(lines.map((one) => one.getAttribute('data-series'))).toEqual(['1', '2'])
    expect(lines[0]?.getAttribute('x1')).toBe('0')
    expect(lines[0]?.getAttribute('x2')).toBe('100')
    const spend = await chart(SPEND, 'for="spend" trend')
    const [line] = trends(spend)
    expect([line?.getAttribute('y1'), line?.getAttribute('y2')]).toEqual(['100', '0'])
  })
})

/* Web Awesome Pro's scatter takes a third measure as each point's size; this
   one drew every point one size. */
describe('size-by', () => {
  /* Rate across, p50 up, and p95 as the size, so p50 is the only series. */
  /* A path draws its points at one size, so each size is a path, and a
     size is drawn to the nearest thirty-second: sqrt(30 / 60) is 0.7071, and
     23 / 32 is 0.71875. */
  test('takes the named column out of the series and sizes each point by area', async () => {
    const host = await chart(LOAD, 'for="load" size-by="p95"')
    const points = dots(host)
    expect(points.map((one) => one.series)).toEqual(['1', '1', '1'])
    expect(points.map((one) => one.weight)).toEqual([String(23 / 32), 'none', '1'])
    expect(all(host, 'point')).toHaveLength(3)
  })

  /* The size is a measure the picture draws, so the readout says it as the
     bubble does. It is no series, so the series keys pass over it. A row with
     no size says none. */
  test('says the sized measure in the readout, and the series keys pass over it', async () => {
    const host = await chart(LOAD, 'for="load" size-by="p95"')
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
    key('Home')
    await host.updateComplete
    expect(part(host, 'live')?.textContent).toBe('1: Rate 100, p50 10, p95 30 (1 of 3)')
    key('ArrowRight')
    await host.updateComplete
    expect(part(host, 'live')?.textContent).toBe('2: Rate 200, p50 12 (2 of 3)')
    expect((host as Chart & { seriesOf(cell: number): number | undefined }).seriesOf(3)).toBe(
      undefined,
    )
  })

  test('draws every point one size where nothing names a size', async () => {
    const host = await chart(LOAD, 'for="load"')
    expect(dots(host).every((one) => one.weight === 'none')).toBe(true)
  })
})

/* A page could not hear which reading a reader was on, or that one was pressed. */
describe('the reading, heard by the page', () => {
  test('is sent as it moves, and when Enter presses it', async () => {
    const host = (await chart(SPEND, 'for="spend"')) as HTMLElement & {
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
      `helix-reading-change ${at} E keyboard`,
      `helix-reading-press ${at} E keyboard`,
    ])
  })
})

/* An empty table drew a blank plot at full height, which reads as a chart that
   failed, and a chart waiting for its readings drew the same. */
describe('with nothing to draw', () => {
  const EMPTY = `<table id="none"><thead><tr><th scope="col">Month</th><th scope="col">Spend</th><th scope="col">Revenue</th></tr></thead><tbody></tbody></table>`
  const FULL = `<table id="some"><thead><tr><th scope="col">Month</th><th scope="col">Spend</th><th scope="col">Revenue</th></tr></thead><tbody><tr><th scope="row">Jan</th><td>3</td><td>6</td></tr><tr><th scope="row">Feb</th><td>5</td><td>9</td></tr></tbody></table>`

  const host = async (table: string, attributes: string, inside = ''): Promise<HTMLElement> => {
    await mount(
      `<div>${table}<helix-headless-scatter-chart ${attributes}>${inside}</helix-headless-scatter-chart></div>`,
    )
    const chart = document.querySelector('helix-headless-scatter-chart') as HTMLElement & {
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

  /* An empty chart lost its name: the plot was a bare box around the words. */
  test('keeps its name, as a group around the words, and takes no focus', async () => {
    const chart = await host(EMPTY, 'for="none" label="Nothing"')
    const plot = part(chart, 'plot')
    expect([plot?.getAttribute('role'), plot?.getAttribute('aria-label')]).toEqual([
      'group',
      'Nothing',
    ])
    expect(plot?.hasAttribute('tabindex')).toBe(false)
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
    columns: ['Month', 'Spend', 'Revenue'],
    rows: [
      ['Jan', 10, 20],
      ['Feb', 20, 41],
      ['Mar', 15, 29],
    ],
  }

  test('draws the readings, named by the caption, where no table is named', async () => {
    const chart = (await mount(
      '<helix-headless-scatter-chart></helix-headless-scatter-chart>',
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
    chart.data = { columns: ['Month', 'Spend', 'Revenue'], rows: [] }
    await chart.updateComplete
    expect(part(chart, 'empty')?.textContent?.trim()).toBe('No readings')
  })

  test('a table named by for wins over data', async () => {
    await mount(
      `<div><table id="t"><caption>From the table</caption><thead><tr><th>Month</th><th>Spend</th><th>Revenue</th></tr></thead><tbody><tr><th>Jan</th><td>3</td><td>6</td></tr></tbody></table><helix-headless-scatter-chart for="t"></helix-headless-scatter-chart></div>`,
    )
    const chart = document.querySelector('helix-headless-scatter-chart') as HTMLElement & {
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
