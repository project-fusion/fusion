import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/**
 * The readings in a path, as `[x, y]` pairs.
 *
 * **Anchor points, not every coordinate.** A cubic segment carries two control
 * points before the reading it lands on, so a pattern like `/[ML]x,y/` matches
 * the first reading of a smooth curve and nothing else, and it fails silently:
 * `Math.max` of a one-element array is that element, so a scale assertion built
 * on it agrees with itself about nothing.
 *
 * The anchor is the last pair of whatever command drew the segment, which is
 * the same point whichever curve is in use.
 */
const anchors = (path: string): Array<[number, number]> =>
  [...path.matchAll(/([MLC])([^MLCHVZ]*)/g)].map((command) => {
    const [x, y] = ((command[2] ?? '').trim().split(/\s+/).at(-1) ?? '').split(',')
    return [Number(x), Number(y)]
  })

/** A series that never approaches zero, which is what the range rule is about. */
const SESSIONS = `<table id="sessions">
  <caption>Sessions a month</caption>
  <thead><tr><th scope="col">Month</th><th scope="col">Sessions</th></tr></thead>
  <tbody>
    <tr><th scope="row">Jan</th><td data-value="980">980</td></tr>
    <tr><th scope="row">Feb</th><td data-value="1000">1000</td></tr>
    <tr><th scope="row">Mar</th><td data-value="1020">1020</td></tr>
  </tbody>
</table>`

const CHANNELS = `<table id="channels">
  <caption>Sessions by channel</caption>
  <thead><tr><th scope="col">Month</th><th scope="col">Direct</th><th scope="col">Referral</th></tr></thead>
  <tbody>
    <tr><th scope="row">Jan</th><td data-value="10">10</td><td data-value="4">4</td></tr>
    <tr><th scope="row">Feb</th><td data-value="20">20</td><td data-value="8">8</td></tr>
  </tbody>
</table>`

/** A series that crosses zero, so the baseline has somewhere to sit. */
const SWING = `<table id="swing">
  <thead><tr><th scope="col">Month</th><th scope="col">Change</th></tr></thead>
  <tbody>
    <tr><th scope="row">Jan</th><td data-value="-5">-5</td></tr>
    <tr><th scope="row">Feb</th><td data-value="5">5</td></tr>
  </tbody>
</table>`

const chart = async (table: string, attributes = ''): Promise<HTMLElement> => {
  await mount(
    `<div>${table}<helix-headless-line-chart ${attributes}></helix-headless-line-chart></div>`,
  )
  const host = document.querySelector('helix-headless-line-chart') as HTMLElement & {
    updateComplete: Promise<unknown>
  }
  await host.updateComplete
  return host
}

const lines = (host: HTMLElement): Element[] => [
  ...(host.shadowRoot?.querySelectorAll('[part="line"]') ?? []),
]

const d = (one: Element | null | undefined): string => one?.getAttribute('d') ?? ''

const termini = (host: HTMLElement): Element[] => [
  ...(host.shadowRoot?.querySelectorAll('[part="terminus"]') ?? []),
]

/**
 * The mark on where each series ends.
 *
 * **One per series rather than one per chart**, which is the difference from
 * `Sparkline` and the whole of why the shared sheet needed a second reader: the
 * shapes are the same sheet's either way, and only the count and the color are
 * this component's.
 */
describe('termini', () => {
  test('one per series, absent meaning a dot', async () => {
    const host = await chart(CHANNELS, 'for="channels"')
    expect(termini(host)).toHaveLength(2)
    expect(host.hasAttribute('terminus')).toBe(false)
  })

  /**
   * Every series here shares an x-axis, so they all end at the same reading and
   * the marks form a column. That column is the useful thing, and a mark drifting
   * off it would mean the x was computed per series rather than from the axis.
   */
  test('they sit in one column, because the series share an axis', async () => {
    const host = await chart(CHANNELS, 'for="channels"')
    const xs = termini(host).map(
      (one) => /--chart-terminus-x:\s*([^;]+)/.exec(one.getAttribute('style') ?? '')?.[1],
    )
    expect(new Set(xs).size).toBe(1)
  })

  test('each takes its own series color, so a mark matches its line', async () => {
    const host = await chart(CHANNELS, 'for="channels"')
    const series = termini(host).map(
      (one) => /--chart-series:\s*var\(([^)]+)\)/.exec(one.getAttribute('style') ?? '')?.[1],
    )
    expect(series).toEqual(['--chart-series-1', '--chart-series-2'])
  })

  test('`none` draws none of them', async () => {
    const host = await chart(CHANNELS, 'for="channels" terminus="none"')
    expect(termini(host)).toHaveLength(0)
  })

  /** A mark on the end of something with no length is a mark on nothing. */
  test('a series of one reading gets no mark', async () => {
    const single = `<table id="single">
      <caption>One</caption>
      <tbody><tr><th scope="row">Jan</th><td data-value="5">5</td></tr></tbody>
    </table>`
    const host = await chart(single, 'for="single"')
    expect(termini(host)).toHaveLength(0)
  })

  /**
   * The hole a ring leaves is cut out of the drawing, so the stroke stops at the
   * ring's inner edge rather than running to the reading at its center. One layer
   * per series: a single `mask-image` would only ever cut the last one, which is
   * what `mask-composite: intersect` in the stylesheet is for.
   */
  test('`ring` asks the drawing for one hole per series', async () => {
    const host = await chart(CHANNELS, 'for="channels" terminus="ring"')
    const holes = part(host, 'plot')?.getAttribute('style') ?? ''
    expect(holes.match(/radial-gradient/g)).toHaveLength(2)
  })

  test('and no other shape asks the drawing for anything', async () => {
    for (const shape of ['', 'terminus="square"', 'terminus="triangle"', 'terminus="none"']) {
      const host = await chart(CHANNELS, `for="channels" ${shape}`)
      expect(part(host, 'plot')?.getAttribute('style') ?? '').not.toContain('radial-gradient')
    }
  })
})

describe('line chart', () => {
  test('reads the table it names and draws one line per series', async () => {
    const host = await chart(CHANNELS, 'for="channels"')
    expect(lines(host)).toHaveLength(2)
  })

  test('takes the palette in order, so a legend beside it agrees', async () => {
    const host = await chart(CHANNELS, 'for="channels"')
    expect(lines(host).map((one) => one.getAttribute('data-series'))).toEqual(['1', '2'])
  })

  test('names each reading beside the drawing, not inside it', async () => {
    /* Inside, they would scale with the box: an `<svg>` filling its container
       scales type along with everything else, and there is no non-scaling-font
       to answer it the way `vector-effect` answers a stroke. */
    const host = await chart(SESSIONS, 'for="sessions"')
    const names = [...(host.shadowRoot?.querySelectorAll('[part="label"]') ?? [])].map((one) =>
      one.textContent?.trim(),
    )
    expect(names).toEqual(['Jan', 'Feb', 'Mar'])
  })

  test('a reading sits in the middle of its slot, so its name lines up under it', async () => {
    /* Spanning the full box is the obvious version and it puts the readings on
       the gridlines *between* the label columns, which are equal shares of the
       width. Measured in a browser before this: the first name centered at a
       twelfth of the width with its point at zero, every label off by half a
       slot. Inset, all six centers landed on their vertices exactly.
     *
       Three readings, so the slots are a third each and the centers are at
       16.67, 50 and 83.33. */
    const host = await chart(SESSIONS, 'for="sessions"')
    const xs = anchors(d(lines(host)[0])).map(([x]) => x)
    expect(xs[0]).toBeCloseTo(100 / 6, 1)
    expect(xs[1]).toBeCloseTo(50, 1)
    expect(xs[2]).toBeCloseTo(100 - 100 / 6, 1)
  })

  test('measures from its own range, so a flat-looking series keeps its shape', async () => {
    /* The rule that is the opposite of the bar chart's, and on purpose. Forcing
       zero into 980..1020 puts every reading within four percent of the top of
       the box, which is a rule rather than a line. */
    const host = await chart(SESSIONS, 'for="sessions"')
    const path = d(lines(host)[0])
    const ys = anchors(path).map(([, y]) => y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(90)
  })

  test('`zero` forces it in, for where the distance from nothing is the point', async () => {
    const host = await chart(SESSIONS, 'for="sessions" zero')
    const path = d(lines(host)[0])
    const ys = anchors(path).map(([, y]) => y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(10)
  })

  test('draws the zero rule only when zero is inside the range', async () => {
    /* A rule at the foot of a chart whose lowest reading is 980 is the bottom
       of the box wearing the zero line's clothes, and a reader takes it for
       one. */
    expect(part(await chart(SESSIONS, 'for="sessions"'), 'baseline')).toBeNull()
    expect(part(await chart(SWING, 'for="swing"'), 'baseline')).not.toBeNull()
  })

  test('one scale across every series, since two scales is two charts', async () => {
    const host = await chart(CHANNELS, 'for="channels"')
    const [first, second] = lines(host)
    const low = (one: Element | undefined): number => Math.max(...anchors(d(one)).map(([, y]) => y))
    // The smaller series sits nearer the floor; on its own scale it would touch it.
    expect(low(second)).toBeGreaterThan(low(first))
    expect(low(second)).toBe(100)
  })

  test('the curve changes the path and nothing else about the reading', async () => {
    const resting = d(lines(await chart(SESSIONS, 'for="sessions"'))[0])
    const straight = d(lines(await chart(SESSIONS, 'for="sessions" curve="straight"'))[0])
    const smooth = d(lines(await chart(SESSIONS, 'for="sessions" curve="smooth"'))[0])
    const step = d(lines(await chart(SESSIONS, 'for="sessions" curve="step"'))[0])
    // Saying nothing gets the smooth curve; `straight` is what opts out of it.
    expect(resting).toBe(smooth)
    expect(smooth).not.toBe(straight)
    expect(step).not.toBe(straight)
    expect(smooth).toContain('C')
    expect(straight).not.toContain('C')
    // And the curve is the only thing that moved: every reading lands where it
    // did, which is the half of this test's name that was never asserted.
    expect(anchors(smooth)).toEqual(anchors(straight))
  })

  test('`area` adds a wash that closes along the floor, and absent adds none', async () => {
    expect(part(await chart(SESSIONS, 'for="sessions"'), 'area')).toBeNull()
    const washed = await chart(SESSIONS, 'for="sessions" area')
    const wash = d(part(washed, 'area'))
    expect(wash).toContain(d(lines(washed)[0]))
    expect(wash.endsWith('Z')).toBe(true)
  })

  test('the drawing is hidden, because the table it read is the readable one', async () => {
    const host = await chart(SESSIONS, 'for="sessions"')
    const plot = part(host, 'plot')
    expect(plot?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect([plot?.getAttribute('role'), plot?.getAttribute('aria-label')]).toEqual([
      'application',
      'Sessions a month',
    ])
  })

  /* **No chart carries `title` on its plot.** On an element that is
     `aria-hidden="true"` it is a mouse tooltip and not an accessible name, so
     nothing reading the page with assistive technology hears it, and the table
     it was drawn from is the readable form by design.

     What the caption fallback does is asserted in
     `mixin-chart-source.dom.spec.ts`, where the one implementation lives rather
     than in each family. */

  test('naming nothing draws nothing rather than throwing', async () => {
    const host = await chart(SESSIONS, '')
    expect(lines(host)).toHaveLength(0)
  })

  test('the line really is in the SVG namespace, and really draws', async () => {
    /* A nested Lit template is parsed on its own, so a `<path>` written in one
       lands in the XHTML namespace and draws nothing. Every sparkline spec
       passed on exactly that for a while, because they asserted markup rather
       than rendering. `getBBox` throws on anything that is not SVG. */
    if (!hasLayout()) {
      return
    }
    const host = await chart(SESSIONS, 'for="sessions"')
    const line = lines(host)[0] as SVGGraphicsElement
    expect(line.getBBox().width).toBeGreaterThan(0)
  })
})

/* A blank keeps its place. Counted by position, a blank in the first data
   column took Feb off the axis and Referral's Feb value stood under Mar. */
describe('a blank cell', () => {
  const GAP = `<table id="gap">
    <thead><tr><th>Month</th><th>Direct</th><th>Referral</th></tr></thead>
    <tbody>
      <tr><th>Jan</th><td>10</td><td>4</td></tr>
      <tr><th>Feb</th><td></td><td>8</td></tr>
      <tr><th>Mar</th><td>30</td><td>6</td></tr>
      <tr><th>Apr</th><td>40</td><td>2</td></tr>
    </tbody>
  </table>`

  const labels = (host: HTMLElement): string[] =>
    [...(host.shadowRoot?.querySelectorAll('[part="label"]') ?? [])].map(
      (one) => one.textContent?.trim() ?? '',
    )

  test('keeps its reading on the axis', async () => {
    const host = await chart(GAP, 'for="gap"')
    expect(labels(host)).toEqual(['Jan', 'Feb', 'Mar', 'Apr'])
  })

  test('breaks the line, and the readings after it stay over their own names', async () => {
    const host = await chart(GAP, 'for="gap" curve="straight"')
    const [direct, referral] = lines(host)
    // Four slots of 25, so the readings sit at 12.5, 37.5, 62.5 and 87.5.
    expect(d(direct).match(/M/g)).toHaveLength(1)
    expect(anchors(d(direct)).map(([x]) => x)).toEqual([62.5, 87.5])
    expect(anchors(d(referral)).map(([x]) => x)).toEqual([12.5, 37.5, 62.5, 87.5])
  })

  test('and the tooltip and the drawing describe the same row', async () => {
    const host = (await chart(GAP, 'for="gap"')) as HTMLElement & {
      pointer: { set: (at: number) => void }
      updateComplete: Promise<unknown>
    }
    host.pointer.set(1)
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('[part="tooltip-label"]')?.textContent).toBe('Feb')
    const guide = host.shadowRoot?.querySelector('[part="guide"]')
    expect(Number(guide?.getAttribute('x1'))).toBe(37.5)
  })
})

/* `label` and the caption were documented to name the chart and did nothing:
   the drawing is hidden, and nothing else was rendered. */
describe('the summary', () => {
  test('names the chart and gives each series its latest reading', async () => {
    const host = await chart(CHANNELS, 'for="channels"')
    expect(part(host, 'summary')?.textContent?.trim()).toBe(
      'Sessions by channel, Feb: Direct 20, Referral 8.',
    )
  })

  test('and says where a series ended when the last row is blank for it', async () => {
    const table = `<table id="ended">
      <thead><tr><th>Month</th><th>Direct</th><th>Referral</th></tr></thead>
      <tbody>
        <tr><th>Jan</th><td>10</td><td>4</td></tr>
        <tr><th>Feb</th><td>20</td><td></td></tr>
      </tbody>
    </table>`
    const host = await chart(table, 'for="ended" label="Sessions"')
    expect(part(host, 'summary')?.textContent?.trim()).toBe(
      'Sessions, Feb: Direct 20; Jan: Referral 4.',
    )
  })
})

/* The plot is read by key: it takes focus, the arrows move the reading the
   tooltip shows, and the readout says it in words. No peer charting library
   ships this, so it is asserted per chart rather than assumed from the
   controller. */
describe('reading by key', () => {
  const press = (host: HTMLElement, key: string): void => {
    part(host, 'plot')?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
    )
  }

  test('the arrows move the reading, and the readout says it', async () => {
    const host = await chart(CHANNELS, 'for="channels"')
    expect(part(host, 'live')?.textContent).toBe('')
    press(host, 'End')
    await (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    expect(part(host, 'live')?.textContent).toBe('Feb: Direct 20, Referral 8')
    expect(part(host, 'tooltip-label')?.textContent).toBe('Feb')
  })
})

describe('reading one series by key', () => {
  test('the down arrow rests on a series, and the readout says that cell alone', async () => {
    const host = await chart(CHANNELS, 'for="channels"')
    const plot = part(host, 'plot')
    for (const key of ['ArrowRight', 'ArrowDown', 'ArrowDown']) {
      plot?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
    }
    await (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    expect(part(host, 'live')?.textContent).toBe('Jan, Referral 4')
    expect(part(host, 'tooltip-cell-current')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Referral 4',
    )
  })
})
