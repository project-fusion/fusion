import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { Row } from '../read-series/read-series.js'

/**
 * What a pointer resting on a reading shows, as markup every chart shares.
 *
 * **A chart does not draw its own tooltip, and the top layer is why.**
 * `Tooltip` renders `popover="manual"`, so it clears every stacking context and
 * every `overflow` on the page. A box drawn by the chart is `position:
 * absolute` inside the plot and is clipped by, or layered under, whatever sits
 * beside the chart. Escaping that means reimplementing `PopoverController`,
 * which is `Tooltip` with extra steps and a second copy of the hard part.
 *
 * **The tag is the caller's, so this file supplies one.** Writing
 * `helix-tooltip` here would name a tag only `helix/styled` registers, leaving a
 * consumer of the headless tier alone with an inert unknown element. Passing it
 * in is what lets each tier answer with its own name, and it is asserted below
 * rather than assumed.
 *
 * The element is still undefined in this package and that still costs nothing:
 * an unknown element carries every attribute and child rendered into it, and
 * those are what is asserted.
 */
let drawTooltip: typeof import('./draw-tooltip.js').drawTooltip
let render: typeof import('lit').render
let unsafeStatic: typeof import('lit/static-html.js').unsafeStatic
let nothing: typeof import('lit').nothing

beforeAll(async () => {
  registerDom()
  ;({ drawTooltip } = await import('./draw-tooltip.js'))
  ;({ unsafeStatic } = await import('lit/static-html.js'))
  ;({ nothing, render } = await import('lit'))
})

const ROWS: Row[] = [
  {
    cells: [
      { name: 'Revenue', text: '$128k', value: 128_000 },
      { name: 'Note', text: 'Outage' },
    ],
    label: 'March',
  },
  { cells: [{ name: 'Revenue', text: '$96k', value: 96_000 }], label: 'April' },
]

const TAG = 'helix-tooltip'

const drawn = (at: number, where?: Parameters<typeof drawTooltip>[3]): HTMLElement => {
  const into = document.createElement('div')
  render(drawTooltip(ROWS, at, unsafeStatic(TAG), where), into)
  return into
}

const texts = (into: HTMLElement, part: string): string[] =>
  [...into.querySelectorAll(`[part="${part}"]`)].map((one) => one.textContent?.trim() ?? '')

describe('a reading the pointer is resting on', () => {
  test('is named by the row’s own label', () => {
    expect(texts(drawn(0), 'tooltip-label')).toEqual(['March'])
  })

  /* `$128k` is what the cell says and `128000` is what the drawing measured. A
     tooltip printing the second is the chart overruling the table about how its
     own figure reads. */
  test('and shows the table’s text rather than the number behind it', () => {
    expect(texts(drawn(0), 'tooltip-value')).toEqual(['$128k', 'Outage'])
  })

  /* Every cell of the row, including columns nothing was plotted from, because
     a note or a status beside the figures is most of the reason to want a
     tooltip at all. */
  test('every cell of it, plotted or not', () => {
    expect(texts(drawn(0), 'tooltip-name')).toEqual(['Revenue', 'Note'])
  })

  /* The table is the accessible representation and the drawing is
     `aria-hidden`; a reader on a keyboard gets the table, which they can reach,
     rather than a tooltip which they cannot. */
  test('and is hidden from assistive technology, because the table is the way in', () => {
    expect(drawn(0).querySelector('[slot="content"]')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('the color a cell wears', () => {
  /* A cell with no number is a column no chart drew: a note, a status, a name.
     Given `data-series` anyway it takes a series color and the stylesheet
     draws a dot, so a row reading `Note  Outage` arrived wearing series three's
     green while the legend beside the chart said series three was something
     else. */
  test('is a series color only where something was plotted in it', () => {
    const cells = [...drawn(0).querySelectorAll('[part="tooltip-cell"]')]
    expect(cells.map((one) => one.getAttribute('data-series'))).toEqual(['1', null])
  })

  /* A cell's place in its row is its place in the *table*, and a chart's series
     are what it read off that table. `ScatterChart` splits the first numeric
     column off as the measure across, so counted from the cell index its bubble
     painted the across column in series one, the color the points are drawn in,
     and gave the series actually plotted series two. */
  test('is the chart’s to decide, since a column is not a series', () => {
    const into = document.createElement('div')
    render(
      drawTooltip(ROWS, 0, unsafeStatic(TAG), undefined, (cell) =>
        cell === 0 ? undefined : cell + 4,
      ),
      into,
    )
    const cells = [...into.querySelectorAll('[part="tooltip-cell"]')]
    expect(cells.map((one) => one.getAttribute('data-series'))).toEqual([null, null])
  })

  test('and the color travels beside the index, so one rule paints the dot', () => {
    const into = document.createElement('div')
    render(
      drawTooltip(ROWS, 0, unsafeStatic(TAG), undefined, () => 7),
      into,
    )
    const cell = into.querySelector('[part="tooltip-cell"]') as HTMLElement
    expect(cell.getAttribute('data-series')).toBe('7')
    expect(cell.getAttribute('style')).toContain('--chart-series: var(--chart-series-7)')
  })
})

describe('where the bubble points', () => {
  test('is the middle of the reading’s own slot when the chart says nothing', () => {
    const mark = drawn(1).querySelector('[part="mark"]') as HTMLElement
    expect(mark.style.insetInlineStart).toBe('75%')
    expect(mark.style.insetBlockStart).toBe('0%')
  })

  /* The chart says which side it prefers and `FloatingController` moves it if
     that side does not fit, which is how a slice at any bearing gets a bubble
     that points at it. Four hard-coded sides could not express a bearing, which
     is what made the donut's arrow miss its own ring. */
  test('and is whatever the chart worked out, where it worked one out', () => {
    const into = drawn(0, { placement: 'left', x: '12%', y: '80%' })
    const mark = into.querySelector('[part="mark"]') as HTMLElement
    expect([mark.style.insetInlineStart, mark.style.insetBlockStart]).toEqual(['12%', '80%'])
    expect(into.querySelector('helix-tooltip')?.getAttribute('placement')).toBe('left')
  })

  /* A drawing that mirrors on a right-to-left page is measured from its inline
     start, so the mark follows the reading there. A whole ring does not mirror,
     so its bearing is measured from the left in either direction. */
  test('from the plot’s left instead, for a drawing that does not turn', () => {
    const into = drawn(0, { fixed: true, placement: 'right', x: '90%', y: '50%' })
    const mark = into.querySelector('[part="mark"]') as HTMLElement
    expect([mark.style.left, mark.style.top]).toEqual(['90%', '50%'])
    expect(mark.style.insetInlineStart).toBe('')
  })

  /* A scatter's plane is left to right on every page and the bubble is inside
     it, so the words would run that way too. The chart says which way they
     run, and says nothing otherwise, the bubble then taking the plot's. */
  test('with its words running the way the chart says, and the plot’s otherwise', () => {
    const into = drawn(0, { dir: 'rtl', fixed: true, placement: 'top', x: '10%', y: '40%' })
    expect(into.querySelector('helix-tooltip')?.getAttribute('dir')).toBe('rtl')
    expect(drawn(0).querySelector('helix-tooltip')?.hasAttribute('dir')).toBe(false)
  })

  /* The id is fixed rather than generated: it is scoped to this chart's shadow
     root, where it is the only one, so nothing can collide with it and nothing
     has to be threaded through a render to stay in step. `for` resolves through
     `getRootNode().getElementById()`, and a chart's shadow root is a
     `ShadowRoot`, so this is the whole anchoring mechanism. */
  test('by naming a mark the tooltip can resolve inside the chart', () => {
    const into = drawn(0)
    const named = into.querySelector('helix-tooltip')?.getAttribute('for')
    expect(named).toBe('helix-chart-mark')
    expect(into.querySelector(`#${named}`)).not.toBeNull()
  })

  /* Whatever tag the caller hands over is the tag in the document: a headless
     tier passes `helix-headless-tooltip` and a styled one passes
     `helix-tooltip`, and neither is written down in the util. */
  test('under whichever tag the caller named, and no other', () => {
    const into = document.createElement('div')
    render(drawTooltip(ROWS, 0, unsafeStatic('helix-headless-tooltip')), into)
    expect(into.querySelector('helix-headless-tooltip')).not.toBeNull()
    expect(into.querySelector('helix-tooltip')).toBeNull()
  })
})

describe('a reading that is not there', () => {
  test('draws nothing rather than an empty bubble', () => {
    expect(drawTooltip(ROWS, 9, unsafeStatic(TAG))).toBe(nothing)
    expect(drawTooltip([], 0, unsafeStatic(TAG))).toBe(nothing)
  })
})
