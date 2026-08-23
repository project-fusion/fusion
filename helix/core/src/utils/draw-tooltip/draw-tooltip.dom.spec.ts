import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'
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
 * `helix-tooltip` is not defined in this package, which costs nothing here: an
 * unknown element still carries every attribute and child that was rendered
 * into it, and those are what is being asserted.
 */
let drawTooltip: typeof import('./draw-tooltip.js').drawTooltip
let render: typeof import('lit').render
let nothing: typeof import('lit').nothing

beforeAll(async () => {
  registerDom()
  ;({ drawTooltip } = await import('./draw-tooltip.js'))
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

const drawn = (at: number, where?: Parameters<typeof drawTooltip>[2]): HTMLElement => {
  const into = document.createElement('div')
  render(drawTooltip(ROWS, at, where), into)
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

describe('the colour a cell wears', () => {
  /* A cell with no number is a column no chart drew: a note, a status, a name.
     Given `data-series` anyway it takes a series colour and the stylesheet
     draws a dot, so a row reading `Note  Outage` arrived wearing series three's
     green while the legend beside the chart said series three was something
     else. */
  test('is a series colour only where something was plotted in it', () => {
    const cells = [...drawn(0).querySelectorAll('[part="tooltip-cell"]')]
    expect(cells.map((one) => one.getAttribute('data-series'))).toEqual(['1', null])
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
})

describe('a reading that is not there', () => {
  test('draws nothing rather than an empty bubble', () => {
    expect(drawTooltip(ROWS, 9)).toBe(nothing)
    expect(drawTooltip([], 0)).toBe(nothing)
  })
})
