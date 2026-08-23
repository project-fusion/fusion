import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'

/**
 * The half of a chart that is about finding its numbers rather than drawing.
 *
 * Four families had written this out separately, and the row that asked for it
 * set the bar: two copies is a coincidence and three is a pattern. There were
 * five copies of `for`, four of `label` and three of the caption fallback by
 * the time the line and donut charts landed.
 *
 * **The bug the extraction found is the one worth a spec of its own.**
 * `SourceController` watches whatever it resolved on connect, and nothing tells
 * it the id changed. `BarChart` re-resolved on `for` and `LineChart` and
 * `DonutChart` did not, which is the kind of difference that survives precisely
 * because each file looked complete on its own: pointing a bar chart at a
 * second table worked, and pointing a line chart at one left it drawing the
 * first.
 */
const tag = 'probe-chart'

type Module = typeof import('./mixin-chart-source.js')
let PALETTE: Module['PALETTE']
let seriesIndex: Module['seriesIndex']

interface Chart extends HTMLElement {
  for: string
  label: string
  named: string
  readings: number
  rows: { cells: { name: string; text: string; value?: number }[]; label: string }[]
  series: { name: string; points: { label: string; value: number }[] }[]
  renders: number
  updateComplete: Promise<boolean>
}

/* **Every one of these is imported after registration, including the two plain
   constants.** A static import for `PALETTE` alone pulls this module in, and
   with it `HelixElement`, before `registerDom()` has swapped the globals, so the
   base class extends bun's own `HTMLElement` rather than happy-dom's. The
   element then defines without complaint and the parser crashes upgrading it,
   inside `innerHTML`, with `attributes.getNamedItem` undefined: an error about
   the parser that is really about import order. Second time this has bitten,
   after `HelixFallbackCommandEvent extends Event`, and neither says anything
   about the constant that dragged the module in. */
beforeAll(async () => {
  registerDom()
  const { HelixElement } = await import('../../helix-element/helix-element.js')
  const source = await import('./mixin-chart-source.js')
  ;({ PALETTE, seriesIndex } = source)
  customElements.define(
    tag,
    class extends source.MixinChartSource(HelixElement) {
      /* Counted, because what `watch()` guarantees is a *repaint*, and nothing
         about the numbers can show it: `source.element` resolves from `for`
         on every read. */
      renders = 0
      protected override updated(changed: Map<PropertyKey, unknown>): void {
        super.updated(changed)
        this.renders += 1
      }
    },
  )
})

const TABLE = (id: string, caption: string, rows: string) => `
  <table id="${id}">
    <caption>${caption}</caption>
    <thead><tr><th>Month</th><th>Revenue</th><th>Note</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`

/* `data-value` beside the text, because `$128k` is what a reader should see and
   is not a number: `Number('$128k')` is NaN and the column would not be a
   series at all. That split is the whole reason `rows` exists beside `series`,
   so the fixture has to carry both. */
const PAGE = `
  ${TABLE('first', 'Revenue by month', '<tr><th scope="row">March</th><td data-value="128000">$128k</td><td>Outage</td></tr><tr><th scope="row">April</th><td data-value="96000">$96k</td><td></td></tr>')}
  ${TABLE('second', 'Something else', '<tr><th scope="row">May</th><td data-value="50000">$50k</td><td></td></tr>')}
  <${tag} for="first"></${tag}>`

/**
 * Adds a row to a table, as nodes rather than as markup.
 *
 * `insertAdjacentHTML('beforeend', '<tr>…')` on a `<tbody>` inserts nothing at
 * all here, measured: the row count does not move. It still counts as a
 * mutation, so the observer fires and the chart repaints, which is the worst
 * shape for a test to be in: the repaint assertion passed and the row it was
 * supposed to be about had never arrived.
 */
const addRow = (table: string, label: string, value: number): void => {
  const row = document.createElement('tr')
  row.innerHTML = `<th scope="row">${label}</th><td data-value="${value}">$${value}</td><td></td>`
  ;(document.getElementById(table) as HTMLElement).querySelector('tbody')?.append(row)
}

/** A tick for the observer, then whatever update it asked for. */
const settled = async (one: Chart): Promise<void> => {
  await new Promise((done) => setTimeout(done, 0))
  await one.updateComplete
}

const chart = async (markup = PAGE): Promise<Chart> => {
  document.body.innerHTML = markup
  const one = document.querySelector(tag) as Chart
  await one.updateComplete
  return one
}

describe('the table a chart reads', () => {
  test('is the one its `for` names', async () => {
    const one = await chart()
    expect(one.rows.map((row) => row.label)).toEqual(['March', 'April'])
  })

  test('and changes when the chart is pointed at another one', async () => {
    const one = await chart()
    one.for = 'second'
    await one.updateComplete
    expect(one.rows.map((row) => row.label)).toEqual(['May'])
  })

  /* **The bug the extraction found, and it is about repainting rather than
     about the numbers.** `source.element` resolves from `for` on every read, so
     the figures follow a change of `for` whether or not anything watches. What
     does not follow is the `MutationObserver`: it stays on the table resolved
     at connect, so an edit to the new table repaints nothing, and an edit to
     the *old* one repaints the chart with the new one's data. `BarChart`
     re-pointed it and `LineChart` and `DonutChart` did not.

     My first attempt at this asserted the rows after changing `for`, which
     passes either way, so it said nothing. */
  test('and follows it, so an edit to the new table is what repaints', async () => {
    const one = await chart()
    one.for = 'second'
    await one.updateComplete
    const before = one.renders
    addRow('second', 'June', 70_000)
    await settled(one)
    expect(one.renders).toBeGreaterThan(before)
    expect(one.rows.map((row) => row.label)).toEqual(['May', 'June'])
  })

  test('and lets go of the one it left, which no longer repaints anything', async () => {
    const one = await chart()
    one.for = 'second'
    await one.updateComplete
    const before = one.renders
    addRow('first', 'May', 1)
    await settled(one)
    expect(one.renders).toBe(before)
  })

  test('or nothing at all, where the id names nothing', async () => {
    const one = await chart()
    one.for = 'absent'
    await one.updateComplete
    expect([one.rows, one.series, one.readings]).toEqual([[], [], 0])
  })
})

describe('what a chart is called', () => {
  /* A caption is already written, already the right words, and already what a
     reader of the table sees. A chart that made the consumer say it twice would
     be asking for the second one to drift. */
  test('is the table’s own caption where the consumer said nothing', async () => {
    expect((await chart()).named).toBe('Revenue by month')
  })

  test('and the consumer’s word where they did', async () => {
    const one = await chart()
    one.label = 'Q1'
    await one.updateComplete
    expect(one.named).toBe('Q1')
  })

  test('or nothing, rather than the name of a table that is not there', async () => {
    const one = await chart()
    one.for = 'absent'
    await one.updateComplete
    expect(one.named).toBe('')
  })
})

describe('the numbers and the words', () => {
  /* One per *numeric* column, so the Note beside the figures is not a series
     nobody can plot. */
  test('are columns as series, one each, and only the ones with numbers in', async () => {
    const one = await chart()
    expect(one.series.map((series) => series.name)).toEqual(['Revenue'])
    expect(one.series[0]?.points.map((point) => point.value)).toEqual([128_000, 96_000])
  })

  /* Deliberately not `series`. A chart draws numbers; a reader resting a
     pointer on one wants what the table says, which is `$128k` and not
     `128000`, and often wants the column beside it that nothing plotted. */
  test('and rows as text, which is what a tooltip shows', async () => {
    const one = await chart()
    expect(one.rows[0]?.cells.map((cell) => cell.text)).toEqual(['$128k', 'Outage'])
    expect(one.rows[0]?.cells[0]?.value).toBe(128_000)
  })

  test('with the count the pointer maps onto', async () => {
    expect((await chart()).readings).toBe(2)
  })
})

describe('the palette a series takes its colour from', () => {
  /* Four families held the same `const PALETTE = 24` and the legend held a
     fifth: when it went from eight to twenty-four, one was missed and drew
     every ninth series in the first colour again while the legend beside it
     named the ninth. A number two files have to agree on is a number that will
     stop agreeing. */
  test('counts from one, because the properties are named from one', () => {
    expect([seriesIndex(0), seriesIndex(1)]).toEqual([1, 2])
  })

  test('and starts over rather than running out', () => {
    expect(seriesIndex(PALETTE)).toBe(1)
    expect(seriesIndex(PALETTE + 1)).toBe(2)
  })

  test('so every series has a colour, however many there are', () => {
    for (let series = 0; series < PALETTE * 3; series += 1) {
      const slot = seriesIndex(series)
      expect(slot).toBeGreaterThanOrEqual(1)
      expect(slot).toBeLessThanOrEqual(PALETTE)
    }
  })
})

describe('a chart inside another component', () => {
  /* Resolved through `getRootNode()`, so a chart in a shadow root names a table
     in that root rather than in the document. An id is scoped to its tree, and
     resolving through `document` would find a table belonging to somebody
     else's component or none at all. */
  test('finds the table beside it rather than one in the document', async () => {
    document.body.innerHTML = `${TABLE('shared', 'The document’s', '<tr><th scope="row">Wrong</th><td>1</td><td></td></tr>')}<div id="box"></div>`
    const box = document.getElementById('box') as HTMLElement
    const root = box.attachShadow({ mode: 'open' })
    root.innerHTML = `${TABLE('shared', 'The component’s', '<tr><th scope="row">Right</th><td>2</td><td></td></tr>')}<${tag} for="shared"></${tag}>`
    const one = root.querySelector(tag) as Chart
    await one.updateComplete
    expect(one.named).toBe('The component’s')
    expect(one.rows.map((row) => row.label)).toEqual(['Right'])
  })
})
