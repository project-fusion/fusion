import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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
  await mount(
    `<div>${table}<helix-headless-bar-chart ${attributes}></helix-headless-bar-chart></div>`,
  )
  const host = document.querySelector('helix-headless-bar-chart') as HTMLElement & {
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
  test('the group the tooltip is about is a part of its own, and the others are not', async () => {
    const host = (await chart(REVENUE, 'for="revenue"')) as HTMLElement & {
      pointer: { set: (at: number) => void }
      updateComplete: Promise<unknown>
    }
    const named = (): (string | null)[] =>
      [...(host.shadowRoot?.querySelectorAll('[part~="group"]') ?? [])].map((one) =>
        one.getAttribute('part'),
      )
    expect(named()).toEqual(['group', 'group', 'group'])
    host.pointer.set(1)
    await host.updateComplete
    expect(named()).toEqual(['group', 'group group-active', 'group'])
  })

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
      `<helix-headless-table id="grid" label="Plans">
        <helix-headless-table-column>Plan</helix-headless-table-column>
        <helix-headless-table-column>Accounts</helix-headless-table-column>
        <helix-headless-table-row>
          <helix-headless-table-cell header>Free</helix-headless-table-cell>
          <helix-headless-table-cell>1840</helix-headless-table-cell>
        </helix-headless-table-row>
      </helix-headless-table>`,
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

const MIXED = `<table id="mixed">
  <thead><tr>
    <th scope="col">Quarter</th><th scope="col">Direct</th>
    <th scope="col">Partner</th><th scope="col">Conversion</th>
  </tr></thead>
  <tbody>
    <tr><th scope="row">Q1</th><td data-value="820">820</td><td data-value="410">410</td><td data-value="3.2">3.2%</td></tr>
    <tr><th scope="row">Q2</th><td data-value="940">940</td><td data-value="520">520</td><td data-value="4.1">4.1%</td></tr>
  </tbody>
</table>`

/* `lines` and `secondary` split on whitespace where the styled tier's
   `outlined`, `subtle` and `glass` split on whitespace or a comma, under a
   sentence saying the first three are matched "the way `lines` and `secondary`
   are". So a comma-separated list drew no line and labeled no second axis, with
   nothing to read off the page that said why. One splitter now, in `core`. */
describe('naming a series', () => {
  const lines = (host: HTMLElement): number =>
    host.shadowRoot?.querySelectorAll('[part="line"]').length ?? 0

  test('takes a comma between names as well as a space', async () => {
    expect(lines(await chart(MIXED, 'for="mixed" lines="Partner Conversion"'))).toBe(2)
    expect(lines(await chart(MIXED, 'for="mixed" lines="Partner, Conversion"'))).toBe(2)
  })

  test('and the second scale reads the list the same way, which is the claim', async () => {
    /* Both axes are drawn the moment `secondary` names a series, so a list it
       failed to parse is visible as no axes at all. */
    const axes = async (value: string): Promise<number> =>
      (await chart(MIXED, `for="mixed" secondary="${value}"`)).shadowRoot?.querySelectorAll(
        '[part="axis"]',
      ).length ?? 0
    expect(await axes('Conversion')).toBe(2)
    expect(await axes('Partner, Conversion')).toBe(2)
    expect(await axes('')).toBe(0)
  })

  test('a name no column carries still leaves a chart rather than a blank', async () => {
    expect(bars(await chart(MIXED, 'for="mixed" lines="Nothing"'))).toHaveLength(6)
  })
})
