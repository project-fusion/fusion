import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The first page served as rows, handed over to the rows the table draws.
 *
 * A framework that renders on a server writes the first page as `TableRow`
 * children, and leaves `rows` empty until it hydrates. The table shows those
 * rows until `rows` holds a row, then draws its own in their place and leaves
 * the served ones in the page, unshown: they are the framework's markup, and
 * removing them would be a change its hydration reports. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
  document.body.innerHTML = ''
})

interface Table extends HTMLElement {
  rows: readonly Record<string, unknown>[]
  updateComplete: Promise<unknown>
}

const files = [
  { name: 'bravo', size: 4 },
  { name: 'alpha', size: 30 },
  { name: 'charlie', size: 1000 },
]

/** The first page as a server writes it: sorted by name, two to a page. */
const served = (...pairs: [string, number][]): string =>
  pairs
    .map(
      ([name, size]) =>
        `<helix-headless-table-row><helix-headless-table-cell header>${name}</helix-headless-table-cell><helix-headless-table-cell>${size}</helix-headless-table-cell></helix-headless-table-row>`,
    )
    .join('')

const table = async (rows: string): Promise<Table> =>
  (await mount(
    `<helix-headless-data-table label="Files" page-size="2" default-sort="name:asc">
      <helix-headless-table-column field="name" row-header>Name</helix-headless-table-column>
      <helix-headless-table-column field="size" text-align="end">Size</helix-headless-table-column>
      ${rows}
    </helix-headless-data-table>`,
  )) as Table

/** The slot that stands in for the drawn rows, and what it shows. */
const shown = (element: Table): Element[] =>
  element.shadowRoot
    ?.querySelector<HTMLSlotElement>('[part="table"] > slot:not([name])')
    ?.assignedElements() ?? []

const drawn = (element: Table): string[] =>
  [...(element.shadowRoot?.querySelectorAll('[part~="row"]') ?? [])].map((row) =>
    [...row.querySelectorAll('[part~="cell"]')].map((cell) => cell.textContent?.trim()).join(' '),
  )

const heard = (): string[] => {
  const warnings: string[] = []
  console.warn = (message: string) => warnings.push(message)
  return warnings
}

describe('a data table whose page served its first page', () => {
  test('shows the served rows while `rows` is empty, and says nothing about emptiness', async () => {
    const element = await table(served(['alpha', 30], ['bravo', 4]))
    expect(shown(element).map((row) => row.textContent)).toEqual(['alpha30', 'bravo4'])
    expect(drawn(element)).toEqual([])
    expect(part(element, 'empty')).toBeNull()
    expect(element.matches(':state(empty)')).toBe(false)
    /* Not a count of nothing over rows a reader can see. */
    const internals = (element as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaRowCount).toBeNull()
  })

  test('draws its own rows once `rows` holds one, and leaves the served rows in the page unshown', async () => {
    const element = await table(served(['alpha', 30], ['bravo', 4]))
    const page = [...element.querySelectorAll('helix-headless-table-row')]
    element.rows = files
    await element.updateComplete
    expect(drawn(element)).toEqual(['alpha 30', 'bravo 4'])
    expect(shown(element)).toEqual([])
    expect([...element.querySelectorAll('helix-headless-table-row')]).toEqual(page)
    const assigned = [...(element.shadowRoot?.querySelectorAll('slot') ?? [])].flatMap((slot) =>
      slot.assignedElements(),
    )
    expect(page.some((row) => assigned.includes(row))).toBe(false)
  })

  test('never shows them again, so an empty result says it is empty', async () => {
    const element = await table(served(['alpha', 30], ['bravo', 4]))
    element.rows = files
    await element.updateComplete
    element.rows = []
    await element.updateComplete
    expect(shown(element)).toEqual([])
    expect(part(element, 'empty')).not.toBeNull()
  })

  test('keeps the columns in the header row throughout', async () => {
    const element = await table(served(['alpha', 30], ['bravo', 4]))
    const head = element.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="columns"]')
    expect(head?.assignedElements().map((column) => column.textContent)).toEqual(['Name', 'Size'])
    element.rows = files
    await element.updateComplete
    expect(head?.assignedElements().map((column) => column.textContent)).toEqual(['Name', 'Size'])
  })

  test('says nothing when the first drawn page shows what was served', async () => {
    const warnings = heard()
    const element = await table(served(['alpha', 30], ['bravo', 4]))
    element.rows = files
    await element.updateComplete
    expect(warnings).toEqual([])
  })

  test('warns once, in a development build, when the first drawn page differs', async () => {
    const warnings = heard()
    /* Served unsorted, and the table sorts by name. */
    const element = await table(served(['bravo', 4], ['alpha', 30]))
    element.rows = files
    await element.updateComplete
    element.rows = [...files]
    await element.updateComplete
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('serves row 1 as "bravo | 4" and draws it as "alpha | 30"')
  })
})

/* **The pagination's row is held while the served rows stand in.** With no
 * count the pagination has one page and draws nothing, so a row would appear
 * under the rows once they arrive and move everything below it. The footer is
 * marked for the styled tier to keep its height while the served page is
 * full, and only then: a shorter page is the whole result. */
describe('the pagination under the rows the page served', () => {
  const footer = (element: Table): Element | null => part(element, 'footer')

  test('is held while a full served page stands in, and let go once the rows draw', async () => {
    const element = await table(served(['alpha', 30], ['bravo', 4]))
    expect(footer(element)?.hasAttribute('data-held')).toBe(true)
    element.rows = files
    await element.updateComplete
    expect(footer(element)?.hasAttribute('data-held')).toBe(false)
  })

  test('is not held under a served page shorter than a page, which is the whole result', async () => {
    const element = await table(served(['alpha', 30]))
    expect(footer(element)?.hasAttribute('data-held')).toBe(false)
  })

  test('is not held when the table draws no pagination', async () => {
    const element = await table(served(['alpha', 30], ['bravo', 4]))
    ;(element as Table & { paginated: boolean }).paginated = false
    await element.updateComplete
    expect(footer(element)?.hasAttribute('data-held')).toBe(false)
  })
})

/* **The checkbox and grip headings stay over their columns while the served
 * rows stand in**: the styled tier leads each served row with a box in their
 * place, so they are drawn from the start. */
describe('the checkbox and grip headings over the rows the page served', () => {
  test('are drawn while the served rows stand in', async () => {
    const element = (await mount(
      `<helix-headless-data-table label="Files" row-key="name" reorderable-rows selectable>
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
        ${served(['alpha', 30])}
      </helix-headless-data-table>`,
    )) as Table
    expect(shown(element)).toHaveLength(1)
    expect(part(element, 'select-all')).not.toBeNull()
    expect(part(element, 'grip-head')).not.toBeNull()
  })
})

describe('a data table whose page served no rows', () => {
  test('has no slot for them, and says it is empty while `rows` is', async () => {
    const element = await table('')
    expect(element.shadowRoot?.querySelector('[part="table"] > slot:not([name])')).toBeNull()
    expect(part(element, 'empty')).not.toBeNull()
  })
})
