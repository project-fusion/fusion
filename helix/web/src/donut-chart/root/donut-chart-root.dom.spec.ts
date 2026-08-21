import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The radius follows the thickness so the outer edge always lands at 40, so a
   ring of the resting thickness is drawn at `40 - 16 / 2`. Written out rather
   than imported, because a spec that derives its expectation the same way the
   code does asserts only that the code agrees with itself. */
const CIRCUMFERENCE = 2 * Math.PI * 32

const TRAFFIC = `<table id="traffic">
  <caption>Sessions by source</caption>
  <thead><tr><th scope="col">Source</th><th scope="col">Share</th></tr></thead>
  <tbody>
    <tr><th scope="row">Direct</th><td data-value="50">50</td></tr>
    <tr><th scope="row">Search</th><td data-value="30">30</td></tr>
    <tr><th scope="row">Social</th><td data-value="20">20</td></tr>
  </tbody>
</table>`

const NEGATIVE = `<table id="negative">
  <thead><tr><th scope="col">Source</th><th scope="col">Share</th></tr></thead>
  <tbody>
    <tr><th scope="row">Direct</th><td data-value="75">75</td></tr>
    <tr><th scope="row">Refunds</th><td data-value="-10">-10</td></tr>
    <tr><th scope="row">Search</th><td data-value="25">25</td></tr>
  </tbody>
</table>`

const chart = async (table: string, attributes = ''): Promise<HTMLElement> => {
  await mount(`<div>${table}<helix-donut-chart ${attributes}></helix-donut-chart></div>`)
  const host = document.querySelector('helix-donut-chart') as HTMLElement & {
    updateComplete: Promise<unknown>
  }
  await host.updateComplete
  return host
}

const segments = (host: HTMLElement): Element[] => [
  ...(host.shadowRoot?.querySelectorAll('[part="segment"]') ?? []),
]

/** The drawn length of a slice, which is the first number of its dash. */
const drawn = (one: Element | undefined): number =>
  Number(one?.getAttribute('stroke-dasharray')?.split(' ')[0] ?? 0)

describe('donut chart', () => {
  test('reads the table it names and draws one slice per row', async () => {
    expect(segments(await chart(TRAFFIC, 'for="traffic"'))).toHaveLength(3)
  })

  test('each slice takes its share of the circumference', async () => {
    const host = await chart(TRAFFIC, 'for="traffic"')
    const [a, b, c] = segments(host)
    expect(drawn(a)).toBeCloseTo(CIRCUMFERENCE * 0.5, 2)
    expect(drawn(b)).toBeCloseTo(CIRCUMFERENCE * 0.3, 2)
    expect(drawn(c)).toBeCloseTo(CIRCUMFERENCE * 0.2, 2)
  })

  test('the slices close the ring exactly, with nothing lost to rounding', async () => {
    const host = await chart(TRAFFIC, 'for="traffic"')
    const total = segments(host).reduce((sum, one) => sum + drawn(one), 0)
    expect(total).toBeCloseTo(CIRCUMFERENCE, 6)
  })

  test('each slice begins where the last one ended', async () => {
    const host = await chart(TRAFFIC, 'for="traffic"')
    const offsets = segments(host).map((one) =>
      Math.abs(Number(one.getAttribute('stroke-dashoffset'))),
    )
    expect(offsets[0]).toBe(0)
    expect(offsets[1]).toBeCloseTo(CIRCUMFERENCE * 0.5, 2)
    expect(offsets[2]).toBeCloseTo(CIRCUMFERENCE * 0.8, 2)
  })

  test('drops a negative row rather than drawing it backwards', async () => {
    /* A share of a whole cannot be less than nothing. An arc for a negative
       either runs backwards over its neighbours or vanishes, and the total it
       was counted in is wrong either way. The remaining two are 75 and 25 of a
       hundred, not of ninety. */
    const host = await chart(NEGATIVE, 'for="negative"')
    const drawnLengths = segments(host).map(drawn)
    expect(drawnLengths[0]).toBeCloseTo(CIRCUMFERENCE * 0.75, 2)
    expect(drawnLengths[1]).toBe(0)
    expect(drawnLengths[2]).toBeCloseTo(CIRCUMFERENCE * 0.25, 2)
  })

  test('takes the palette in order, so a legend beside it agrees', async () => {
    const host = await chart(TRAFFIC, 'for="traffic"')
    expect(segments(host).map((one) => one.getAttribute('data-series'))).toEqual(['1', '2', '3'])
  })

  test('draws a track under the slices, so a partial ring is still a ring', async () => {
    expect(part(await chart(TRAFFIC, 'for="traffic"'), 'track')).not.toBeNull()
  })

  test('keeps its aspect ratio, alone among the charts', async () => {
    /* The others stretch to their box and rescue the stroke with
       `vector-effect`, which rescues strokes and not geometry. A ring drawn that
       way is an ellipse. */
    const host = await chart(TRAFFIC, 'for="traffic"')
    const svg = host.shadowRoot?.querySelector('svg')
    expect(svg?.getAttribute('preserveAspectRatio')).toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 100 100')
  })

  test('the drawing is hidden, because the table it read is the readable one', async () => {
    const host = await chart(TRAFFIC, 'for="traffic"')
    expect(part(host, 'plot')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('falls back to the caption, which is already the right words', async () => {
    expect(part(await chart(TRAFFIC, 'for="traffic"'), 'plot')?.getAttribute('title')).toBe(
      'Sessions by source',
    )
  })

  test('a whole of nothing draws no slices rather than dividing by zero', async () => {
    const empty = `<table id="empty">
      <thead><tr><th scope="col">Source</th><th scope="col">Share</th></tr></thead>
      <tbody><tr><th scope="row">None</th><td data-value="0">0</td></tr></tbody>
    </table>`
    expect(segments(await chart(empty, 'for="empty"'))).toHaveLength(0)
  })

  test('the middle takes whatever is slotted into it', async () => {
    const host = await chart(TRAFFIC, 'for="traffic"')
    expect(part(host, 'centre')?.querySelector('slot')).not.toBeNull()
  })
})

describe('donut chart tooltip', () => {
  const hover = async (host: HTMLElement, index: number): Promise<void> => {
    segments(host)[index]?.dispatchEvent(new Event('pointerenter'))
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
  }

  test('a slice says which reading it is, rather than x deciding', async () => {
    /* The donut turns the pointer controller's tracking off. Its slices are
       real elements at every angle, and x alone would give the same reading for
       three o'clock and nine o'clock, which are opposite sides of the ring. */
    const host = await chart(TRAFFIC, 'for="traffic"')
    await hover(host, 1)
    /* Queried in the chart's own shadow root rather than through `part="tooltip"`.
       The bubble is `Tooltip`'s now and reaches a consumer through `exportparts`;
       what the chart still owns is the content it slots into it. */
    expect(host.shadowRoot?.querySelector('[part="tooltip-label"]')?.textContent).toBe('Search')
  })

  test('nothing is shown until a pointer is on a slice', async () => {
    const host = await chart(TRAFFIC, 'for="traffic"')
    expect(host.shadowRoot?.querySelector('helix-tooltip')).toBeNull()
  })

  test('the slice under the pointer is marked, so the ring says which one too', async () => {
    const host = await chart(TRAFFIC, 'for="traffic"')
    await hover(host, 2)
    expect(segments(host).map((one) => one.hasAttribute('data-active'))).toEqual([
      false,
      false,
      true,
    ])
  })
})

describe('donut chart hole', () => {
  const radius = (host: HTMLElement): number => Number(segments(host)[0]?.getAttribute('r') ?? 0)

  test('the outer edge holds at 40 whatever the thickness, so nothing clips', async () => {
    /* The bug this replaced: a fixed `r=40` with the stroke astride it grew
       outward as well as inward, so a thickness past 20 crossed the view box
       and was cut with nothing to say so. Derived, `r + thickness / 2` is 40
       for every value. */
    for (const [hole, thickness] of [
      ['small', 26],
      ['', 16],
      ['large', 8],
      ['none', 40],
    ] as const) {
      const host = await chart(TRAFFIC, `for="traffic" ${hole ? `hole="${hole}"` : ''}`)
      expect(radius(host) + thickness / 2).toBeCloseTo(40, 6)
    }
  })

  test('`none` closes the hole entirely, which is a pie', async () => {
    const host = await chart(TRAFFIC, 'for="traffic" hole="none"')
    /* Inner edge at the centre: `r - thickness / 2` is zero, which solves to
       `r = EDGE / 2` and not to `r = 0`. A radius of zero draws nothing, and
       that was the first version of this arithmetic. */
    expect(radius(host)).toBeCloseTo(20, 6)
    expect(radius(host) - 40 / 2).toBeCloseTo(0, 6)
  })

  test('a pie renders no middle, since there is nowhere to slot anything', async () => {
    /* A slot nobody can see is worse than one that is not there: a consumer
       fills it and nothing happens. */
    expect(part(await chart(TRAFFIC, 'for="traffic" hole="none"'), 'centre')).toBeNull()
    expect(part(await chart(TRAFFIC, 'for="traffic"'), 'centre')).not.toBeNull()
  })

  test('the dash follows the radius, so the slices still close the ring', async () => {
    const host = await chart(TRAFFIC, 'for="traffic" hole="large"')
    const total = segments(host).reduce((sum, one) => sum + drawn(one), 0)
    expect(total).toBeCloseTo(2 * Math.PI * radius(host), 6)
  })
})
