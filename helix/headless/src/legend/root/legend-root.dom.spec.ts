import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const TRAFFIC = `<table id="traffic">
  <thead><tr><th>Week</th><th>Direct</th><th>Search</th><th>Referral</th></tr></thead>
  <tbody>
    <tr><th scope="row">W1</th><td>120</td><td>80</td><td>20</td></tr>
    <tr><th scope="row">W2</th><td>140</td><td>96</td><td>24</td></tr>
  </tbody>
</table>`

const PLANS = `<table id="plans">
  <caption>Accounts by plan</caption>
  <tbody>
    <tr><th scope="row">Free</th><td>1840</td></tr>
    <tr><th scope="row">Team</th><td>612</td></tr>
    <tr><th scope="row">Enterprise</th><td>78</td></tr>
  </tbody>
</table>`

/** Mounts a table and a legend together, and returns the legend. */
const legend = async (table: string, attributes: string): Promise<HTMLElement> => {
  await mount(`<div>${table}<helix-base-legend ${attributes}></helix-base-legend></div>`)
  const host = document.querySelector('helix-base-legend') as HTMLElement & {
    updateComplete: Promise<unknown>
  }
  await host.updateComplete
  return host
}

const names = (host: HTMLElement): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="name"]') ?? [])].map(
    (one) => one.textContent?.trim() ?? '',
  )

const indices = (host: HTMLElement): (string | null)[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="entry"]') ?? [])].map((one) =>
    one.getAttribute('data-series'),
  )

describe('chart legend', () => {
  test('one entry per data column, named by the header row', async () => {
    const host = await legend(TRAFFIC, 'for="traffic"')
    expect(names(host)).toEqual(['Direct', 'Search', 'Referral'])
  })

  test('categories reads the rows instead, which is what a donut has', async () => {
    // A donut's slices are the rows and it has no axis to write their names
    // along, which is the whole reason the legend can read a table both ways.
    const host = await legend(PLANS, 'for="plans" entries="categories"')
    expect(names(host)).toEqual(['Free', 'Team', 'Enterprise'])
  })

  test('the same table read as series is one series, named by the caption', async () => {
    const host = await legend(PLANS, 'for="plans"')
    expect(names(host)).toEqual(['Accounts by plan'])
  })

  test('the entries carry a palette index, which starts over after twenty-four', async () => {
    /* The palette is eight hues in three tones, so a legend past eight repeats
       a hue in a different tone rather than repeating a color. This pinned
       eight until the tokens went to twenty-four, at which point a chart of
       twelve painted series nine and its legend painted series one: the two
       disagreeing is the one thing the legend exists to prevent. */
    const names = Array.from({ length: 26 }, (_, index) => `S${index + 1}`)
    const wide = `<table id="wide"><thead><tr>${['x', ...names]
      .map((header) => `<th>${header}</th>`)
      .join('')}</tr></thead><tbody><tr><th scope="row">R</th>${names
      .map(() => '<td>1</td>')
      .join('')}</tr></tbody></table>`
    const host = await legend(wide, 'for="wide"')
    const drawn = indices(host)
    expect(drawn.slice(0, 8)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
    expect(drawn[23]).toBe('24')
    expect(drawn[24]).toBe('1')
    expect(drawn[25]).toBe('2')
  })

  test('a list is a list, so a screen reader counts the series', async () => {
    const host = await legend(TRAFFIC, 'for="traffic"')
    expect(part(host, 'list')?.getAttribute('role')).toBe('list')
    // The swatch is the color and the color is the one thing it cannot say.
    expect(part(host, 'swatch')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('naming nothing, or naming something that is not a table, is an empty list', async () => {
    expect(names(await legend(TRAFFIC, ''))).toEqual([])
    expect(names(await legend(TRAFFIC, 'for="not-here"'))).toEqual([])
    expect(names(await legend('<p id="prose">Words</p>', 'for="prose"'))).toEqual([])
  })

  test('the table is watched, because nothing else would think to tell it', async () => {
    /* A legend that goes stale the moment its data changes is a legend that has
       to be refreshed by hand, and the page has no reason to know it is being
       read. */
    const host = await legend(TRAFFIC, 'for="traffic"')
    /* Built rather than parsed. `insertAdjacentHTML` is the shorter way to
       write this and happy-dom drops a `<th>` handed to it on a `<tr>`, so the
       first version of this test added nothing and then reported the component
       for not noticing. */
    const header = document.createElement('th')
    header.textContent = 'Email'
    document.querySelector('#traffic thead tr')?.append(header)
    const cell = document.createElement('td')
    cell.textContent = '7'
    document.querySelector('#traffic tbody tr')?.append(cell)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(names(host)).toContain('Email')
  })

  test('renaming a series in place reaches the legend too', async () => {
    // `characterData`, because renaming edits the text node rather than
    // replacing the cell, and `childList` alone would never see it.
    const host = await legend(TRAFFIC, 'for="traffic"')
    const cell = document.querySelectorAll('#traffic thead th')[1] as HTMLElement
    ;(cell.firstChild as Text).data = 'Typed in'
    await new Promise((resolve) => setTimeout(resolve, 0))
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(names(host)[0]).toBe('Typed in')
  })
})
