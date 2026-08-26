import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, part, registerDom, role } from '@helix-io/testing/dom'

/* The data table after hydration.
 *
 * The ordering arithmetic is held by `order.pure.spec.ts`, which needs no DOM.
 * What is here is everything that only exists once there is one: that the
 * columns declared as children become the schema, that a reader's click asks
 * rather than acts, that a controlled axis defers, and that the ARIA row indices
 * describe the whole result rather than the page in front of the reader. */

/**
 * The import goes inside `beforeAll`, after `registerDom`.
 *
 * At module scope it runs before the DOM exists, and `customElement` returns
 * quietly when `customElements` is undefined rather than throwing, because Lit
 * SSR reaches the same line. So the element is never registered, every
 * `<helix-headless-data-table>` stays an inert `HTMLElement`, and twenty specs
 * fail with an empty shadow root and no clue why.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  filter: string
  page: number
  pageSize: number
  rows: readonly Record<string, unknown>[]
  search: (query: string) => boolean
  sort: string
  toggleSort: (field: string) => boolean
  updateComplete: Promise<unknown>
}

const rows = [
  { name: 'delta', size: 200 },
  { name: 'alpha', size: 30 },
  { name: 'charlie', size: 1000 },
  { name: 'bravo', size: 4 },
]

const mount = async (markup: string, data: readonly Record<string, unknown>[] = rows) => {
  const element = (await mountMarkup(markup)) as Table
  element.rows = data
  await element.updateComplete
  return { element, remove: () => element.remove() }
}

/** Lets a spec write the change and then read what it produced. */
const settled = async (element: Table): Promise<void> => {
  await element.updateComplete
}

const cells = (element: HTMLElement) =>
  [...(element.shadowRoot?.querySelectorAll('[part="cell"]') ?? [])].map((cell) =>
    cell.textContent?.trim(),
  )

const bodyRows = (element: HTMLElement) => [
  ...(element.shadowRoot?.querySelectorAll('[part="row"]') ?? []),
]

const heading = (element: HTMLElement) =>
  element.querySelector('helix-headless-table-column') as HTMLElement

const SCHEMA = `
  <helix-headless-data-table label="Files">
    <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
    <helix-headless-table-column field="size" sortable align="end">Size</helix-headless-table-column>
  </helix-headless-data-table>`

describe('the schema comes from the columns', () => {
  test('a cell per column per row, read by field', async () => {
    const { element, remove } = await mount(SCHEMA)
    expect(bodyRows(element)).toHaveLength(4)
    expect(cells(element).slice(0, 2)).toEqual(['delta', '200'])
    remove()
  })

  test('a column with no field renders an empty cell rather than the row stringified', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table>
        <helix-headless-table-column>Actions</helix-headless-table-column>
      </helix-headless-data-table>`)
    expect(cells(element)[0]).toBe('')
    remove()
  })

  test('a dot path reads a nested value, since an API shapes its own rows', async () => {
    const { element, remove } = await mount(
      `<helix-headless-data-table>
        <helix-headless-table-column field="owner.name">Owner</helix-headless-table-column>
      </helix-headless-data-table>`,
      [{ owner: { name: 'Ada' } }],
    )
    expect(cells(element)[0]).toBe('Ada')
    remove()
  })

  test('`cell` wins over the field, and returning undefined declines rather than answers', async () => {
    const { element, remove } = await mount(SCHEMA)
    const column = element.querySelector('helix-headless-table-column') as HTMLElement & {
      cell: (row: Record<string, unknown>) => unknown
    }
    column.cell = (row) => (row.name === 'delta' ? 'DELTA' : undefined)
    element.rows = [...rows]
    await settled(element)
    expect(cells(element)[0]).toBe('DELTA')
    expect(cells(element)[2]).toBe('alpha')
    remove()
  })
})

describe('sorting', () => {
  test('a click on a sortable heading cycles the order', async () => {
    const { element, remove } = await mount(SCHEMA)
    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('name:asc')
    expect(cells(element)[0]).toBe('alpha')

    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('name:desc')
    expect(cells(element)[0]).toBe('delta')

    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('')
    expect(cells(element)[0]).toBe('delta')
    remove()
  })

  test('a column that is not sortable does nothing when clicked', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table>
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`)
    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('')
    remove()
  })

  test('`sortable` with no field is ignored rather than breaking the table', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table>
        <helix-headless-table-column sortable>Actions</helix-headless-table-column>
      </helix-headless-data-table>`)
    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('')
    remove()
  })

  test('`helix-sort` carries the order asked for, and is cancelable', async () => {
    const { element, remove } = await mount(SCHEMA)
    const seen: string[] = []
    element.addEventListener('helix-sort', (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    heading(element).click()
    await settled(element)
    expect(seen).toEqual(['name:asc'])
    remove()
  })

  /**
   * Refusing has to leave the order alone, or a consumer cannot answer the sort
   * themselves: a server-side sort is exactly refusing the local reorder and
   * handing back a new set.
   */
  test('refusing `helix-sort` leaves the order where it was', async () => {
    const { element, remove } = await mount(SCHEMA)
    element.addEventListener('helix-sort', (event) => event.preventDefault())
    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('')
    expect(cells(element)[0]).toBe('delta')
    remove()
  })
})

describe('controlled and uncontrolled', () => {
  test('`default-sort` seeds an order this element then owns', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table default-sort="name:asc">
        <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
      </helix-headless-data-table>`)
    expect(element.sort).toBe('name:asc')
    expect(cells(element)[0]).toBe('alpha')
    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('name:desc')
    remove()
  })

  /**
   * The point of controlled: the element reports the request and changes
   * nothing, so the value on screen is always the consumer's.
   *
   * Declared in markup, which is where the ownership decision is made:
   * `MixinControllerValue` settles it at the first update, because that is where
   * an attribute, a hydrating server's output and a framework's initial
   * properties have all landed.
   */
  /* Asserted the opposite until 26 Aug 2026, when declaring an axis was a claim
     of ownership and the table announced without re-sorting. Control is an
     action now: it applies, and a consumer refuses to take the decision.
     See 294. */
  test('a declared `sort` is a seed, and the element still re-sorts', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table sort="size:asc">
        <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
        <helix-headless-table-column field="size" sortable>Size</helix-headless-table-column>
      </helix-headless-data-table>`)
    expect(cells(element)[0]).toBe('bravo')
    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('name:asc')
    remove()
  })

  test('and refusing the change is what holds the axis', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table sort="size:asc">
        <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
        <helix-headless-table-column field="size" sortable>Size</helix-headless-table-column>
      </helix-headless-data-table>`)
    element.addEventListener('helix-sort', (event: Event) => {
      event.preventDefault()
    })
    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('size:asc')
    expect(cells(element)[0]).toBe('bravo')
    remove()
  })

  /**
   * Writing always applies, which used to be half a convention and is now the
   * whole of it: there is no mode a write could move the element into. See 294.
   */
  test('a script write after mount applies, and the element keeps responding', async () => {
    const { element, remove } = await mount(SCHEMA)
    element.sort = 'size:asc'
    await settled(element)
    expect(cells(element)[0]).toBe('bravo')

    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('name:asc')
    remove()
  })

  /**
   * An axis set back to empty means unsorted, and the element goes on sorting
   * from there. This asserted that emptiness kept a controlled axis controlled,
   * which was a fact about a mode that no longer exists. See 294.
   */
  test('an axis set back to empty is unsorted, and the element still sorts', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table sort="size:asc">
        <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
        <helix-headless-table-column field="size" sortable>Size</helix-headless-table-column>
      </helix-headless-data-table>`)
    element.sort = ''
    await settled(element)
    heading(element).click()
    await settled(element)
    expect(element.sort).toBe('name:asc')
    remove()
  })
})

describe('filtering', () => {
  test('`search` narrows the whole set and reports whether it stood', async () => {
    const { element, remove } = await mount(SCHEMA)
    expect(element.search('a')).toBe(true)
    await settled(element)
    expect(bodyRows(element)).toHaveLength(4)

    element.search('alpha')
    await settled(element)
    expect(bodyRows(element)).toHaveLength(1)
    remove()
  })

  test('refusing `helix-filter` leaves the rows alone', async () => {
    const { element, remove } = await mount(SCHEMA)
    element.addEventListener('helix-filter', (event) => event.preventDefault())
    element.search('alpha')
    await settled(element)
    expect(bodyRows(element)).toHaveLength(4)
    remove()
  })

  test('a filter that matches nothing shows the empty state rather than a blank grid', async () => {
    const { element, remove } = await mount(SCHEMA)
    element.search('nothing here')
    await settled(element)
    expect(bodyRows(element)).toHaveLength(0)
    expect(part(element, 'empty')).not.toBeNull()
    remove()
  })
})

describe('paging', () => {
  test('a page is a slice of the sorted set, not the sort of a slice', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table page-size="2" sort="name:asc">
        <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
      </helix-headless-data-table>`)
    expect(cells(element)).toEqual(['alpha', 'bravo'])
    element.page = 2
    await settled(element)
    expect(cells(element)).toEqual(['charlie', 'delta'])
    remove()
  })

  test('a page past the end reads back as the last page', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table page-size="2" default-page="99">
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`)
    expect(element.page).toBe(2)
    remove()
  })

  test('no page size is every row and no pagination', async () => {
    const { element, remove } = await mount(SCHEMA)
    expect(bodyRows(element)).toHaveLength(4)
    expect(part(element, 'pagination')).toBeNull()
    remove()
  })
})

describe('aria', () => {
  /**
   * The host's own role is on internals, which writes no attribute, so
   * `getAttribute('role')` reports nothing on a correctly-named grid. `role()`
   * is what reads it, and asserting the attribute instead is a test that passes
   * only by accident.
   */
  test('the host is the grid, and the rows and head sit inside it', async () => {
    const { element, remove } = await mount(SCHEMA)
    expect(role(element)).toBe('grid')
    expect(part(element, 'table')?.getAttribute('role')).toBe('rowgroup')
    expect(part(element, 'head')?.getAttribute('role')).toBe('row')
    remove()
  })

  /**
   * **The number describes the result and not the window.** A grid whose
   * indices restart on every page tells a reader on page three that the result
   * is two rows long, which is the one thing `aria-rowindex` exists to prevent.
   */
  test('row indices continue across pages, and the count is the whole result', async () => {
    const { element, remove } = await mount(`
      <helix-headless-data-table page-size="2">
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`)
    const grid = part(element, 'table')
    expect(grid?.getAttribute('aria-rowcount')).toBe('5')
    expect(bodyRows(element).map((row) => row.getAttribute('aria-rowindex'))).toEqual(['2', '3'])

    element.page = 2
    await settled(element)
    expect(bodyRows(element).map((row) => row.getAttribute('aria-rowindex'))).toEqual(['4', '5'])
    expect(grid?.getAttribute('aria-rowcount')).toBe('5')
    remove()
  })

  test('the column count is the columns declared', async () => {
    const { element, remove } = await mount(SCHEMA)
    expect(element.shadowRoot?.querySelector('[part="table"]')?.getAttribute('aria-colcount')).toBe(
      '2',
    )
    remove()
  })
})

describe('server mode', () => {
  /**
   * The mode that has to exist from the start. Filtering a page the consumer
   * already fetched narrows one screen and calls it a search.
   */
  test('nothing is filtered, sorted or paged locally', async () => {
    const { element, remove } = await mount(
      `<helix-headless-data-table mode="server" total="900" page-size="2" sort="name:asc">
        <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
      </helix-headless-data-table>`,
      [{ name: 'zulu' }, { name: 'yankee' }],
    )
    expect(cells(element)).toEqual(['zulu', 'yankee'])
    element.search('nothing matches this')
    await settled(element)
    expect(cells(element)).toEqual(['zulu', 'yankee'])
    remove()
  })

  test('the row count is the consumer’s total rather than the page length', async () => {
    const { element, remove } = await mount(
      `<helix-headless-data-table mode="server" total="900" page-size="2">
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`,
      [{ name: 'zulu' }, { name: 'yankee' }],
    )
    expect(element.shadowRoot?.querySelector('[part="table"]')?.getAttribute('aria-rowcount')).toBe(
      '901',
    )
    remove()
  })
})

describe('the data property', () => {
  /**
   * `MixinCollection` kept its slot counter in a field called `rows`, and
   * TypeScript's `private` is a compile-time claim: the counter and this
   * property would have shared one field, so every `updated` would overwrite the
   * consumer's array with a number. Nothing would have thrown.
   */
  test('rows survives an update, rather than being overwritten by a slot count', async () => {
    const { element, remove } = await mount(SCHEMA)
    expect(element.rows).toHaveLength(4)
    element.page = 1
    await settled(element)
    expect(element.rows).toHaveLength(4)
    expect(bodyRows(element)).toHaveLength(4)
    remove()
  })

  test('the consumer’s array is never reordered under them', async () => {
    const given = [...rows]
    const { element, remove } = await mount(SCHEMA, given)
    heading(element).click()
    await settled(element)
    expect(given.map((row) => row.name)).toEqual(['delta', 'alpha', 'charlie', 'bravo'])
    remove()
  })
})
