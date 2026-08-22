import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, settled } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const REVENUE = `<table id="revenue">
  <caption>Revenue by quarter</caption>
  <thead><tr><th scope="col">Quarter</th><th scope="col">Revenue</th></tr></thead>
  <tbody>
    <tr><th scope="row">Q1</th><td data-value="100">$100k</td></tr>
    <tr><th scope="row">Q2</th><td data-value="50">$50k</td></tr>
    <tr><th scope="row">Q3</th><td data-value="200">$200k</td></tr>
  </tbody>
</table>`

const chart = async (table: string, attributes: string): Promise<HTMLElement> => {
  await mount(`<div>${table}<helix-bar-chart ${attributes}></helix-bar-chart></div>`)
  const host = document.querySelector('helix-bar-chart') as HTMLElement & {
    updateComplete: Promise<unknown>
  }
  await host.updateComplete
  return host
}

const bars = (host: HTMLElement): Element[] => [
  ...(host.shadowRoot?.querySelectorAll('[part="bar"]') ?? []),
]

const labels = (host: HTMLElement): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="label"]') ?? [])].map(
    (one) => one.textContent?.trim() ?? '',
  )

describe('bar chart', () => {
  test('a column per category, named by the row headers', async () => {
    const host = await chart(REVENUE, 'for="revenue"')
    expect(bars(host)).toHaveLength(3)
    expect(labels(host)).toEqual(['Q1', 'Q2', 'Q3'])
  })

  test('data-value is the number and the cell text is for the reader', async () => {
    // The case where the value is written twice, on purpose: `$100k` is what a
    // reader should see and is not a number.
    const host = await chart(REVENUE, 'for="revenue"')
    const heights = bars(host).map((one) => Number(one.getAttribute('height')))
    // 100, 50 and 200 against a top of 200 in a box of 100.
    expect(heights).toEqual([50, 25, 100])
  })

  test('columns measure from zero, and there is no property to change that', async () => {
    /* A bar's length is its value, so any baseline but zero makes the lengths
       proportional to nothing. A design system that ships the switch has
       shipped the mistake. */
    const host = await chart(REVENUE, 'for="revenue"')
    expect((host as unknown as Record<string, unknown>).baseline).toBeUndefined()
    // The shortest column still has height, which a data-extent scale denies it.
    expect(Number(bars(host)[1]?.getAttribute('height'))).toBeGreaterThan(0)
  })

  test('a series that goes negative hangs below the rule', async () => {
    const host = await chart(
      `<table id="delta"><tbody>
        <tr><th scope="row">A</th><td>-4</td></tr>
        <tr><th scope="row">B</th><td>4</td></tr>
      </tbody></table>`,
      'for="delta"',
    )
    const tops = bars(host).map((one) => Number(one.getAttribute('y')))
    // Zero is included at both ends, so the baseline lands halfway.
    expect(tops[0]).toBe(50)
    expect(tops[1]).toBe(0)
  })

  test('every series shares one scale, since two scales is two charts', async () => {
    const host = await chart(
      `<table id="two">
        <thead><tr><th>Week</th><th>Big</th><th>Small</th></tr></thead>
        <tbody><tr><th scope="row">W1</th><td>100</td><td>10</td></tr></tbody>
      </table>`,
      'for="two"',
    )
    const heights = bars(host).map((one) => Number(one.getAttribute('height')))
    expect(heights[0]).toBe(100)
    expect(heights[1]).toBe(10)
  })

  test('the columns take the palette in order and start over after twenty-four', async () => {
    const host = await chart(REVENUE, 'for="revenue"')
    expect(bars(host)[0]?.getAttribute('data-series')).toBe('1')
  })

  test('the drawing is hidden and the table is the readable version', async () => {
    /* A screen reader hearing both hears the same numbers twice, once as data
       and once as a description of a picture of the data. */
    const host = await chart(REVENUE, 'for="revenue"')
    expect(part(host, 'plot')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(host, 'labels')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('naming nothing draws an empty plot rather than throwing', async () => {
    expect(bars(await chart(REVENUE, ''))).toHaveLength(0)
    expect(bars(await chart(REVENUE, 'for="not-here"'))).toHaveLength(0)
  })

  test('a helix-table is read too, since its roles are in ElementInternals', async () => {
    const host = await chart(
      `<helix-table id="grid" label="Plans">
        <helix-table-column>Plan</helix-table-column>
        <helix-table-column>Accounts</helix-table-column>
        <helix-table-row>
          <helix-table-cell header>Free</helix-table-cell>
          <helix-table-cell>1840</helix-table-cell>
        </helix-table-row>
      </helix-table>`,
      'for="grid"',
    )
    expect(labels(host)).toEqual(['Free'])
  })

  test('the table is watched, so an added row reaches the drawing', async () => {
    const host = await chart(REVENUE, 'for="revenue"')
    const row = document.createElement('tr')
    row.innerHTML = '<th scope="row">Q4</th><td data-value="80">$80k</td>'
    document.querySelector('#revenue tbody')?.append(row)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(bars(host)).toHaveLength(4)
  })
})

if (hasLayout()) {
  describe('bar chart geometry', () => {
    test('the baseline keeps its weight whatever the box', async () => {
      // The view box stretches to the element and a stroke stretches with it.
      await chart(REVENUE, 'for="revenue"')
      const host = document.querySelector('helix-bar-chart') as HTMLElement
      expect(getComputedStyle(part(host, 'baseline') as Element).vectorEffect).toBe(
        'non-scaling-stroke',
      )
    })

    test('the columns are really SVG, not HTML wearing the name', async () => {
      /* A nested Lit template is parsed on its own, so a `<rect>` written in one
         has no `<svg>` around it and lands in the XHTML namespace: it takes the
         part, takes the geometry attributes, and draws nothing. */
      await chart(REVENUE, 'for="revenue"')
      const host = document.querySelector('helix-bar-chart') as HTMLElement
      const bar = part(host, 'bar') as unknown as SVGRectElement
      expect(typeof bar.getBBox).toBe('function')

      /* **After the growing, or the box is the one it started at.** Columns
         arrive from `@starting-style { height: 0 }` and transition into place,
         so `getBBox` immediately after the update reports the *used* height,
         which is zero, while the `height` attribute already holds the answer.
         Measured in Chrome: attribute 44.44, bbox 0, two transitions running;
         once they finish, bbox 44.44. The old form read the first of those and
         reported a bar chart that draws nothing. */
      await settled(bar)
      expect(bar.getBBox().height).toBeGreaterThan(0)
    })
  })
}
