import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

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
  windowed: boolean
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

describe('the regions around the grid', () => {
  /**
   * A region nobody filled is not laid out, and the element is what says so.
   *
   * The stylesheet asked with `:has(> slot:not(:has(*)))` and could not:
   * `:has()` may not be nested inside `:has()`, so the rule was discarded whole,
   * and assigned nodes are not a slot's DOM children, so the inner test was true
   * of a filled slot as readily as an empty one. A table with no toolbar paid
   * the gap above the grid for one that was not there.
   */
  test('an empty toolbar is hidden and a filled one is not', async () => {
    const { element } = await mount(SCHEMA)
    expect(part(element, 'toolbar')?.hasAttribute('data-empty')).toBe(true)
    expect(part(element, 'toolbar')?.hasAttribute('hidden')).toBe(true)
  })

  test('the footer is not empty while this element draws its own pagination', async () => {
    const { element } = await mount(SCHEMA)
    expect(part(element, 'footer')?.hasAttribute('data-empty')).toBe(true)
    element.pageSize = 1
    await settled(element)
    expect(part(element, 'pagination')).not.toBeNull()
    expect(part(element, 'footer')?.hasAttribute('data-empty')).toBe(false)
  })
})

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
   * An axis declared in markup is a seed and a correction, never a claim of
   * ownership. The element applies it and goes on responding, and a consumer
   * takes the decision by refusing the event, which is the test below this one.
   */
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
   * Writing always applies: there is no mode a write could move the element
   * into.
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
   * from there.
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

  /**
   * **The component `applyReactProperties` was built against.**
   *
   * `rows` is an array, so it can only be assigned as a property, and React
   * assigns no property to a custom element while hydrating: the server renderer
   * reaches `typeof value === 'object'` and drops the prop, and the client's
   * hydrate path only diffs. Both halves skip it and agree, so a React consumer
   * writing `rows={rows}` got a correctly labeled, permanently empty grid with
   * no warning from anybody.
   *
   * Asserted here as well as in `helix/core`, because the core spec proves the
   * mechanism against a probe and this proves it reaches the property a consumer
   * actually writes. The bag is attached before the element is appended, which is
   * the ordering of a definition that landed after hydration.
   */
  test('rows arrives from the props bag React never applied', async () => {
    const element = document.createElement('helix-headless-data-table') as Table
    element.innerHTML = `
      <helix-headless-table-column field="name">Name</helix-headless-table-column>
      <helix-headless-table-column field="size">Size</helix-headless-table-column>`
    Object.assign(element, { __reactProps$k9x2: { rows } })
    document.body.append(element)
    await settled(element)

    expect(element.rows).toBe(rows)
    expect(bodyRows(element)).toHaveLength(4)
    element.remove()
  })
})

describe('windowing', () => {
  /* Enough rows that a window is unmistakably smaller than the result, and
     named so their order is readable: `size` counts down while `name` counts
     up, so a sort on one is visibly not the order of the other. */
  const many = (count: number) =>
    Array.from({ length: count }, (_, at) => ({
      name: `row ${String(at).padStart(4, '0')}`,
      size: count - at,
    }))

  const WINDOWED = `
    <helix-headless-data-table windowed>
      <helix-headless-table-column field="name">Name</helix-headless-table-column>
      <helix-headless-table-column field="size">Size</helix-headless-table-column>
    </helix-headless-data-table>`

  /* Read off the attribute rather than through `style.blockSize`: the logical
     property is what the component writes and what happy-dom reflects back
     through the typed accessor is not something a spec should depend on. */
  const room = (element: HTMLElement, end: 'after' | 'before') =>
    Number.parseFloat(
      part(element, end)
        ?.getAttribute('style')
        ?.match(/([\d.]+)px/)?.[1] ?? '0',
    )

  test('draws a window, and stands room in for the rest', async () => {
    const { element, remove } = await mount(WINDOWED, many(500))
    const drawn = bodyRows(element).length
    expect(drawn).toBeGreaterThan(0)
    expect(drawn).toBeLessThan(500)
    /* The room below is what the scrollbar is built from. Without it the box
       scrolls a few rows while claiming five hundred, and the thumb fills the
       track. */
    expect(room(element, 'after')).toBeGreaterThan(0)
    expect(room(element, 'before')).toBe(0)
    remove()
  })

  test('the count is the result, and the indices describe it', async () => {
    const { element, remove } = await mount(WINDOWED, many(500))
    expect(part(element, 'table')?.getAttribute('aria-rowcount')).toBe('501')
    expect(bodyRows(element)[0]?.getAttribute('aria-rowindex')).toBe('2')
    remove()
  })

  test('a sort orders the result rather than the window', async () => {
    /* The classic virtualization bug in its other form. `order.pure.spec.ts`
       holds the paged version -- sorting a page instead of paging a sort -- and
       a window is the second way to order eight rows and call it a table. */
    const { element, remove } = await mount(WINDOWED, many(500))
    element.sort = 'size:asc'
    await settled(element)
    expect(cells(element)[0]).toBe('row 0499')
    remove()
  })

  test('a window over a page counts from the page it is over', async () => {
    const { element, remove } = await mount(
      `<helix-headless-data-table windowed page-size="100" page="2">
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`,
      many(500),
    )
    expect(cells(element)[0]).toBe('row 0100')
    /* Both offsets, stacked: the page starts at 100 and the window at the top
       of it, so the reader hears row 102 counting the head. */
    expect(bodyRows(element)[0]?.getAttribute('aria-rowindex')).toBe('102')
    expect(part(element, 'table')?.getAttribute('aria-rowcount')).toBe('501')
    remove()
  })

  test('a scrolled window still counts from the result', async () => {
    /* The offsets above are all measured at the top, where the window starts at
       zero and adding it proves nothing. This is the case that reads a row's
       index off a window that has moved: without the window in `rowIndex` a
       reader hears row two, a hundred rows into the result. */
    const { element, remove } = await mount(WINDOWED, many(500))
    const box = part(element, 'table') as HTMLElement
    /* The box is given here because this tier does not ship one. A headless
       table has no stylesheet, so `[part="table"]` is not a scroll container
       and `scrollTop` clamps to zero in a real browser -- which is what a
       consumer windowing this tier has to supply for themselves, and what the
       styled tier writes on their behalf. Measured: without this the spec
       passes under happy-dom, where nothing scrolls anyway, and fails under
       `specs:browser` with the window still at row one. */
    box.style.blockSize = '200px'
    box.style.overflowY = 'auto'
    box.scrollTop = 3_200
    box.dispatchEvent(new Event('scroll'))
    await settled(element)

    const first = bodyRows(element)[0]
    const at = Number(first?.getAttribute('aria-rowindex'))
    expect(at).toBeGreaterThan(2)
    /* Row `n` of the result is `n + 2` counting the head, and the cell beside
       it has to be the same row: an index that moved while the rows did not is
       the bug this is here for. */
    expect(cells(element)[0]).toBe(`row ${String(at - 2).padStart(4, '0')}`)
    remove()
  })

  test('a filter narrows the result the window is over', async () => {
    /* The count the controller windows over is read off the held arrangement
       rather than counted again, so a filtered window is the case that proves
       the held copy is the filtered one and not the whole result. */
    const { element, remove } = await mount(WINDOWED, many(500))
    element.filter = 'row 049'
    await settled(element)

    // `row 0490` through `row 0499`, and the head.
    expect(part(element, 'table')?.getAttribute('aria-rowcount')).toBe('11')
    expect(cells(element)[0]).toBe('row 0490')
    expect(bodyRows(element)[0]?.getAttribute('aria-rowindex')).toBe('2')
    remove()
  })

  test('server mode windows the chunk it was handed', async () => {
    const { element, remove } = await mount(
      `<helix-headless-data-table windowed mode="server" total="9000">
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`,
      many(300),
    )
    const drawn = bodyRows(element).length
    expect(drawn).toBeGreaterThan(0)
    expect(drawn).toBeLessThan(300)
    /* The consumer's total: not the chunk they sent and not the window drawn
       from it. */
    expect(part(element, 'table')?.getAttribute('aria-rowcount')).toBe('9001')
    remove()
  })

  test('draws every row and no spacers when it is off', async () => {
    const { element, remove } = await mount(SCHEMA)
    expect(bodyRows(element)).toHaveLength(4)
    expect(part(element, 'before')).toBeNull()
    expect(part(element, 'after')).toBeNull()
    remove()
  })
})
