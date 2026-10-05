import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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
  await mount(`<div>${table}<helix-headless-legend ${attributes}></helix-headless-legend></div>`)
  const host = document.querySelector('helix-headless-legend') as HTMLElement & {
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

  /* A scatter reads its first numeric column as the measure *across*, so its
     first plotted series is the table's second. Read as `series` a key beside
     one named the across column in the color of the first series drawn and each
     real series in the next one's: every entry one color out. */
  test('measures drops the first column, which a scatter measures across', async () => {
    const host = await legend(TRAFFIC, 'for="traffic" entries="measures"')
    expect(names(host)).toEqual(['Search', 'Referral'])
    expect(indices(host)).toEqual(['1', '2'])
  })

  test('the entries carry a palette index, which starts over after twenty-four', async () => {
    /* The palette is eight hues in three tones, so a legend past eight repeats
       a hue in a different tone rather than repeating a color. The wrap has to
       match the token count: pinned at eight while the tokens hold twenty-four,
       a chart of twelve paints series nine and its legend paints series one,
       and the two disagreeing is the one thing the legend exists to prevent. */
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
    /* And the mark is not in the tree at all, being paint: the entry carries its
       series and a sheet draws the swatch on it, so there is nothing here whose
       one fact, the color, is the one thing it could not have said. */
    expect(part(host, 'swatch')).toBeNull()
  })

  /* A page of several charts had several unnamed lists, and nothing said which
     chart each one keyed. */
  test('the list is named by the caption of the table, or by `label`', async () => {
    const list = (host: HTMLElement) => part(host, 'list')?.getAttribute('aria-label')
    expect(list(await legend(PLANS, 'for="plans" entries="categories"'))).toBe('Accounts by plan')
    expect(list(await legend(PLANS, 'for="plans" label="Plans"'))).toBe('Plans')
    expect(list(await legend(TRAFFIC, 'for="traffic"'))).toBeNull()
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
       write this and happy-dom drops a `<th>` handed to it on a `<tr>`, so a
       test written that way adds nothing and then reports the component for not
       noticing. */
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

/* Under `toggles` each name is a button that hides its series in every chart
   reading the same table. A series keeps its color while it is hidden. */
describe('toggling a series', () => {
  type Legend = HTMLElement & { hiddenSeries: string; updateComplete: Promise<unknown> }
  const toggles = (host: HTMLElement): HTMLButtonElement[] => [
    ...(host.shadowRoot?.querySelectorAll<HTMLButtonElement>('[part="toggle"]') ?? []),
  ]

  test('is nothing without `toggles`: the names are text', async () => {
    const host = await legend(TRAFFIC, 'for="traffic"')
    expect(toggles(host)).toHaveLength(0)
  })

  test('makes each name a pressed button, pressed while its series is shown', async () => {
    const host = await legend(TRAFFIC, 'for="traffic" toggles hidden-series="Search"')
    expect(toggles(host).map((one) => one.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'true',
    ])
    expect(
      [...(host.shadowRoot?.querySelectorAll('[part~="entry"]') ?? [])].map((one) =>
        one.getAttribute('part'),
      ),
    ).toEqual(['entry', 'entry entry-hidden', 'entry'])
  })

  test('hides a series on a press, asking first and telling after', async () => {
    const host = (await legend(TRAFFIC, 'for="traffic" toggles')) as Legend
    const heard: string[] = []
    host.addEventListener('helix-before-change', (event) =>
      heard.push(`before ${(event as CustomEvent<{ value: string }>).detail.value}`),
    )
    host.addEventListener('change', () => heard.push(`change ${host.hiddenSeries}`))
    toggles(host)[2]?.click()
    toggles(host)[0]?.click()
    await host.updateComplete
    expect(heard).toEqual([
      'before Referral',
      'change Referral',
      'before Referral, Direct',
      'change Referral, Direct',
    ])
    expect(toggles(host)[0]?.getAttribute('aria-pressed')).toBe('false')
  })

  test('keeps the series when the request is refused', async () => {
    const host = (await legend(TRAFFIC, 'for="traffic" toggles')) as Legend
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    toggles(host)[0]?.click()
    await host.updateComplete
    expect(host.hiddenSeries).toBe('')
  })

  /* The chart finds what the legend hid through the table they share. */
  test('takes the series out of a chart reading the same table', async () => {
    await import('../../line-chart/index.js')
    await mount(
      `<div>${TRAFFIC}<helix-headless-line-chart for="traffic"></helix-headless-line-chart><helix-headless-legend for="traffic" toggles></helix-headless-legend></div>`,
    )
    const chart = document.querySelector('helix-headless-line-chart') as unknown as Legend
    const host = document.querySelector('helix-headless-legend') as Legend
    await host.updateComplete
    await chart.updateComplete
    const lines = () => [...(chart.shadowRoot?.querySelectorAll('[part="line"]') ?? [])]
    expect(lines().map((one) => one.getAttribute('data-series'))).toEqual(['1', '2', '3'])
    toggles(host)[1]?.click()
    await host.updateComplete
    await chart.updateComplete
    expect(lines().map((one) => one.getAttribute('data-series'))).toEqual(['1', '3'])
    toggles(host)[1]?.click()
    await host.updateComplete
    await chart.updateComplete
    expect(lines()).toHaveLength(3)
  })

  /* A ring's legend names its rows, and a hidden row is no slice: the others
     close over it. Bar, Area and Scatter read the same set the same way. */
  test('takes a slice out of a ring, by its row', async () => {
    await import('../../donut-chart/index.js')
    await import('../../bar-chart/index.js')
    await mount(
      `<div>${PLANS}<helix-headless-donut-chart for="plans"></helix-headless-donut-chart><helix-headless-legend entries="categories" for="plans" hidden-series="Team"></helix-headless-legend></div>${TRAFFIC}<helix-headless-bar-chart for="traffic"></helix-headless-bar-chart><helix-headless-legend for="traffic" hidden-series="Direct, Referral"></helix-headless-legend>`,
    )
    const ring = document.querySelector('helix-headless-donut-chart') as unknown as Legend
    const bars = document.querySelector('helix-headless-bar-chart') as unknown as Legend
    for (const one of document.querySelectorAll<Legend>('helix-headless-legend')) {
      await one.updateComplete
    }
    await ring.updateComplete
    await bars.updateComplete
    expect(part(ring, 'summary')?.textContent).toBe('Accounts by plan: Free 96%, Enterprise 4%.')
    expect(
      [...(bars.shadowRoot?.querySelectorAll('[part="bar"]') ?? [])].map((one) =>
        one.getAttribute('data-series'),
      ),
    ).toEqual(['2', '2'])
  })
})
