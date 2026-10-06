import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount as mountMarkup,
  part,
  registerDom,
  role,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

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

/** The grid's own semantics, which the host carries on its internals. */
const grid = (element: HTMLElement): ElementInternals =>
  (element as unknown as { internals: ElementInternals }).internals

/** Lets a spec write the change and then read what it produced. */
const settled = async (element: Table): Promise<void> => {
  await element.updateComplete
}

const cells = (element: HTMLElement) =>
  [...(element.shadowRoot?.querySelectorAll('[part~="cell"]') ?? [])].map((cell) =>
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
    <helix-headless-table-column field="size" sortable text-align="end">Size</helix-headless-table-column>
  </helix-headless-data-table>`

/**
 * A column's edge, handed to the cells this element draws.
 *
 * **Published and not drawn**, which is the same side of it `Table` takes: a
 * cell carries its column's `align` as `--data-table-cell-align` and a sheet
 * decides what lining up means. Written here as an inline `text-align` it was
 * the tier that ships no CSS deciding, and it beat any `::part(cell)` rule a
 * consumer wrote, an inline declaration outranking a stylesheet.
 *
 * Read off the attribute rather than through `getComputedStyle`, so the
 * assertion is about what this element wrote and holds in a double with no
 * cascade.
 */
describe('a table seeded from markup and still owning what it was seeded with', () => {
  /* `defaultFilter` is the uncontrolled half of `filter`, the way
     `defaultValue` is of `value`: markup states where the table starts and the
     table goes on applying its own changes from there. Seeded and then never
     read, the narrowed table would come up whole; read as a claim of ownership,
     the reader's own search would be undone on every update. */
  test('`default-filter` narrows the first render', async () => {
    const { element } = await mount(
      SCHEMA.replace('label="Files"', 'label="Files" default-filter="bravo"'),
    )
    expect(element.filter).toBe('bravo')
    expect(cells(element)).toEqual(['bravo', '4'])
  })

  test('and the seed is a starting point, not a claim the table keeps returning to', async () => {
    const { element } = await mount(
      SCHEMA.replace('label="Files"', 'label="Files" default-filter="bravo"'),
    )
    element.search('alpha')
    await settled(element)
    expect(element.filter).toBe('alpha')
    expect(cells(element)).toEqual(['alpha', '30'])
  })
})

describe("a data table publishing each column's edge to its cells", () => {
  const edges = (element: HTMLElement): (string | null)[] =>
    [...(element.shadowRoot?.querySelectorAll('[part~="cell"]') ?? [])]
      .slice(0, 2)
      .map((cell) => cell.getAttribute('style'))

  test('a column that names an edge writes it, and one that does not writes nothing', async () => {
    const { element } = await mount(SCHEMA)
    expect(edges(element)).toEqual([null, '--data-table-cell-align: end'])
  })

  /* `align` is a string anybody can write, and this goes into a style
     attribute, so only the three edges reach it. `Table` holds the same
     value to the same three and said so first. */
  test('an edge it does not know is left out rather than written into a style', async () => {
    const { element } = await mount(SCHEMA)
    heading(element).setAttribute('align', 'middle')
    await settled(element)
    expect(edges(element)[0]).toBe(null)
  })
})

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

  /* TalkBack reads no `aria-sort`, so on Android a sorted column said nothing
     about its order: React Aria describes the header there. */
  test("on Android the sorted column's button says the order, and nowhere else", async () => {
    const said = async (): Promise<(string | null)[]> => {
      const { element, remove } = await mount(SCHEMA)
      heading(element).click()
      await settled(element)
      const columns = [
        ...element.querySelectorAll('helix-headless-table-column'),
      ] as unknown as Updatable[]
      await Promise.all(columns.map((column) => column.updateComplete))
      const words = columns.map(
        (column) =>
          column.shadowRoot?.querySelector('[part="sort"]')?.getAttribute('aria-description') ??
          null,
      )
      remove()
      return words
    }
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129.0 Mobile',
    })
    let android: (string | null)[]
    try {
      android = await said()
    } finally {
      Reflect.deleteProperty(navigator, 'userAgent')
    }
    expect([android, await said()]).toEqual([
      ['Sorted by Name, ascending', null],
      [null, null],
    ])
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

/* Each request here is a proposal another listener may refuse, so a consumer
   storing the table's state needs a notification after each, sent once the
   state is on the element. The request had the plain verb first, so the
   notification takes its past tense, and a page is `helix-activate`, as it is
   from Pagination. */
describe('what moved, said after it moved', () => {
  test('a sort that stood is announced again as `helix-sorted`', async () => {
    const { element, remove } = await mount(SCHEMA)
    const heard: string[] = []
    element.addEventListener('helix-sorted', (event) => {
      heard.push(`${(event as CustomEvent<{ value: string }>).detail.value}@${element.sort}`)
      expect(event.cancelable).toBe(false)
    })
    heading(element).click()
    await settled(element)
    expect(heard).toEqual(['name:asc@name:asc'])
    remove()
  })

  test('and a refused one is not', async () => {
    const { element, remove } = await mount(SCHEMA)
    element.addEventListener('helix-sort', (event) => event.preventDefault())
    let heard = false
    element.addEventListener('helix-sorted', () => {
      heard = true
    })
    heading(element).click()
    await settled(element)
    expect(heard).toBe(false)
    remove()
  })

  test('a query that stood is announced again as `helix-filtered`', async () => {
    const { element, remove } = await mount(SCHEMA)
    const heard: string[] = []
    element.addEventListener('helix-filtered', (event) => {
      heard.push(`${(event as CustomEvent<{ value: string }>).detail.value}@${element.filter}`)
    })
    element.search('alpha')
    await settled(element)
    expect(heard).toEqual(['alpha@alpha'])
    remove()
  })

  test('a page that stood is announced once, by the table', async () => {
    /* The pagination inside sends its own after its own page moves, which is
       stopped the way its request is: one move, one event, from this host. */
    const { element, remove } = await mount(`
      <helix-headless-data-table page-size="2">
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`)
    const heard: string[] = []
    element.addEventListener('helix-activate', (event) => {
      const from = (event.composedPath()[0] as Element).localName
      heard.push(
        `${(event as CustomEvent<{ value: string }>).detail.value}@${element.page} ${from}`,
      )
    })
    const pagination = part(element, 'pagination') as HTMLElement
    part(pagination, 'next')?.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }))
    await settled(element)
    expect(heard).toEqual(['2@2 helix-headless-data-table'])
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
    expect(grid(element).ariaRowCount).toBe('5')
    expect(bodyRows(element).map((row) => row.getAttribute('aria-rowindex'))).toEqual(['2', '3'])

    element.page = 2
    await settled(element)
    expect(bodyRows(element).map((row) => row.getAttribute('aria-rowindex'))).toEqual(['4', '5'])
    expect(grid(element).ariaRowCount).toBe('5')
    /* On the grid, where the two counts mean something. Neither applies to
       the `rowgroup` inside it. */
    expect(part(element, 'table')?.hasAttribute('aria-rowcount')).toBe(false)
    remove()
  })

  test('the column count is the columns declared', async () => {
    const { element, remove } = await mount(SCHEMA)
    expect(grid(element).ariaColCount).toBe('2')
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
    expect(grid(element).ariaRowCount).toBe('901')
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
    expect(grid(element).ariaRowCount).toBe('501')
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
    expect(grid(element).ariaRowCount).toBe('501')
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
    expect(grid(element).ariaRowCount).toBe('11')
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
    expect(grid(element).ariaRowCount).toBe('9001')
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

/**
 * A hidden column, which takes no track and draws no cells.
 *
 * Left in, its heading went and its track and a cell in every row stayed, so
 * the header row came up a heading short, the first cell filled the gap, and
 * every row after it began a column late.
 */
describe('a hidden column', () => {
  const HIDING = `
    <helix-headless-data-table label="Files" default-sort="name:asc">
      <helix-headless-table-column field="name" hidden width="12rem">Name</helix-headless-table-column>
      <helix-headless-table-column field="size" width="6rem">Size</helix-headless-table-column>
    </helix-headless-data-table>`

  const template = (element: HTMLElement): string =>
    part(element, 'table')?.getAttribute('style') ?? ''

  test('lays out no track for it and draws none of its cells', async () => {
    const { element, remove } = await mount(HIDING)
    expect(template(element)).toBe('--data-table-template: 6rem')
    expect(cells(element)).toEqual(['30', '4', '1000', '200'])
    expect(grid(element).ariaColCount).toBe('1')
    remove()
  })

  /* It is still the sort's, which is by field. */
  test('still orders the rows', async () => {
    const { element, remove } = await mount(HIDING)
    element.sort = 'name:desc'
    await settled(element)
    expect(cells(element)).toEqual(['200', '1000', '4', '30'])
    remove()
  })

  /* `hidden` is the platform's attribute and no property of the column's, so
     nothing but the column watching it tells the table. */
  test('draws it again once it is shown', async () => {
    const { element, remove } = await mount(HIDING)
    heading(element).hidden = false
    await new Promise((resolve) => setTimeout(resolve, 0))
    await settled(element)
    expect(template(element)).toBe('--data-table-template: 12rem 6rem')
    expect(cells(element).slice(0, 2)).toEqual(['alpha', '30'])
    expect(grid(element).ariaColCount).toBe('2')
    remove()
  })
})

/* What this family says where there is nothing in it, and while it is fetching.
 *
 * **The words, the moment they appear and which of the two beats the other
 * belong to `MixinCollection`**, which has its own spec beside it in
 * `helix/core`. What belongs here is the one thing the mixin cannot decide,
 * which is what *this* family counts as having rows: every host passes a
 * different expression, so one that got it wrong says "Nothing to show" over a
 * full set, or says nothing at all over an empty one, with the mixin behaving
 * perfectly either way.
 *
 * Words the mixin does not default to, since it holds "Nothing to show" and
 * "Loading": read against those, the assertion is satisfied by the mixin alone
 * and says nothing about the string reaching it from here. */
describe('an empty data table', () => {
  test('says the consumer’s words where there is nothing in it', async () => {
    const { element } = await mount(
      '<helix-headless-data-table label="Files" empty-text="Nothing here yet"></helix-headless-data-table>',
      [],
    )
    expect(part(element, 'empty')?.textContent?.trim()).toBe('Nothing here yet')
  })

  test('and says it is fetching instead, which beats being empty', async () => {
    /* A set that has not arrived is not a set that is empty, so a reader is
       never told there is nothing while a request is still in flight. */
    const { element } = await mount(
      '<helix-headless-data-table label="Files" loading loading-text="Still fetching"></helix-headless-data-table>',
      [],
    )
    expect(part(element, 'loading')?.textContent?.trim()).toBe('Still fetching')
    expect(part(element, 'empty')).toBeNull()
  })
})

/* The grid keyboard model, the way a screen reader in a grid expects it: one
 * tab stop, and the arrow keys moving between cells. The table declared
 * `role="grid"` and implemented none of it, so the arrows did nothing and every
 * grip, sort button and checkbox was a Tab stop of its own. */
describe('the grid keyboard', () => {
  const GRID = `
    <helix-headless-data-table label="Files" selectable row-key="name">
      <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
      <helix-headless-table-column field="size" sortable text-align="end">Size</helix-headless-table-column>
    </helix-headless-data-table>`

  type Grid = Table & { selected: string }

  /** Every element of the grid a Tab can land on. */
  const stops = (element: HTMLElement): Element[] => [
    ...(element.shadowRoot?.querySelectorAll('[part="table"] [tabindex="0"]') ?? []),
    ...[...element.querySelectorAll('helix-headless-table-column')].flatMap((column) => [
      ...(column.shadowRoot?.querySelectorAll('[tabindex="0"], button:not([tabindex])') ?? []),
    ]),
  ]

  /** The focused element, inside the table's shadow root or a column's. */
  const focused = (element: HTMLElement): Element | null => {
    const active = document.activeElement
    if (active === element) {
      return element.shadowRoot?.activeElement ?? null
    }
    return active && element.contains(active) ? (active.shadowRoot?.activeElement ?? null) : null
  }

  const press = async (element: Grid, key: string, init: KeyboardEventInit = {}) => {
    const target = focused(element) as HTMLElement
    target.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key, ...init }),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    await element.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  const place = (cell: Element | null): string =>
    cell?.getAttribute('part') === 'column'
      ? `heading ${(cell.getRootNode() as ShadowRoot).host.textContent?.trim()}`
      : `${cell?.parentElement?.getAttribute('data-row') ?? 'head'}:${cell?.getAttribute('data-column')}`

  const start = async (): Promise<Grid> => {
    const { element } = await mount(GRID)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await settled(element)
    const stop = element.shadowRoot?.querySelector('[part="table"] [tabindex="0"]') as HTMLElement
    stop.focus()
    await settled(element)
    return element as Grid
  }

  test('is one tab stop, with every control inside it out of the order', async () => {
    const { element } = await mount(GRID)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await settled(element)
    expect(stops(element)).toHaveLength(1)
    expect(place(stops(element)[0] as Element)).toBe('0:0')
    for (const checkbox of element.shadowRoot?.querySelectorAll('[part="checkbox"]') ?? []) {
      expect(checkbox.getAttribute('tabindex')).toBe('-1')
    }
  })

  test('moves between cells and rows with the arrows, Home and End', async () => {
    const element = await start()
    await press(element, 'ArrowRight')
    expect(place(focused(element))).toBe('0:1')
    await press(element, 'ArrowDown')
    expect(place(focused(element))).toBe('1:1')
    await press(element, 'End')
    expect(place(focused(element))).toBe('1:2')
    await press(element, 'Home')
    expect(place(focused(element))).toBe('1:0')
    await press(element, 'End', { ctrlKey: true })
    expect(place(focused(element))).toBe('3:2')
    await press(element, 'Home', { ctrlKey: true })
    expect(place(focused(element))).toBe('head:0')
    expect(stops(element)).toHaveLength(1)
  })

  test('reaches the headings, and Enter on a sortable one sorts', async () => {
    const element = await start()
    await press(element, 'ArrowRight')
    await press(element, 'ArrowUp')
    expect(place(focused(element))).toBe('heading Name')
    expect(focused(element)?.getAttribute('role')).toBe('columnheader')
    await press(element, 'Enter')
    expect(element.sort).toBe('name:asc')
  })

  test('selects a row with Space', async () => {
    const element = await start()
    await press(element, 'ArrowDown')
    await press(element, ' ')
    expect(element.selected).toBe('alpha')
  })

  test('moves into a cell with F2 and back out with Escape', async () => {
    const element = await start()
    await press(element, 'F2')
    expect(focused(element)?.getAttribute('part')).toBe('checkbox')
    await press(element, 'Escape')
    expect(place(focused(element))).toBe('0:0')
  })

  /* A row that scrolled out of the window took the focus inside it to the
     body, and the next Tab started again from the top of the page. */
  test('keeps the row holding focus drawn when the window moves away from it', async () => {
    const { element, remove } = await mount(
      `<helix-headless-data-table windowed>
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`,
      Array.from({ length: 500 }, (_, at) => ({ name: `row ${at}` })),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    await settled(element)
    const cell = element.shadowRoot?.querySelector('[data-row="0"] > [data-column]') as HTMLElement
    cell.focus()
    await settled(element)
    const box = part(element, 'table') as HTMLElement
    box.style.blockSize = '200px'
    box.style.overflowY = 'auto'
    box.scrollTop = 3_200
    box.dispatchEvent(new Event('scroll'))
    await settled(element)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await settled(element)
    /* Which rows the window holds depends on how tall a row is drawn, which
       differs with and without layout, so this asks only that the window left
       the top and the focused row stayed. */
    const drawn = bodyRows(element).map((row) => row.getAttribute('data-row'))
    expect(drawn.length).toBeLessThan(100)
    expect(drawn).not.toContain('1')
    expect(drawn).toContain('0')
    expect(cell.isConnected).toBe(true)
    expect(focused(element)).toBe(cell)
    remove()
  })

  test('says every word in the words it is given', async () => {
    const { element } = await mount(
      GRID.replace(
        'label="Files"',
        'label="Files" select-all-label="Alle" select-row-label="{row} wählen" page-size="2" previous-label="Zurück" next-label="Weiter" page-label="Seite {page}" pagination-label="Seiten"',
      ),
    )
    const names = [...(element.shadowRoot?.querySelectorAll('[part="checkbox"]') ?? [])].map(
      (box) => box.getAttribute('aria-label'),
    )
    expect(names).toEqual(['Alle', 'delta wählen', 'alpha wählen'])
    const pagination = part(element, 'pagination') as HTMLElement & Record<string, string>
    expect(pagination.label).toBe('Seiten')
    expect(pagination.previousLabel).toBe('Zurück')
    expect(pagination.nextLabel).toBe('Weiter')
    expect(pagination.pageLabel).toBe('Seite {page}')
  })

  /* RAC's Table names each row by its row header column; every body cell here
     was a gridcell, so moving between rows said nothing of which row. */
  test('names each row by its first column with a field, or the one marked row-header', async () => {
    const { element } = await mount(GRID)
    await settled(element)
    const roles = (row: number) =>
      [...(element.shadowRoot?.querySelectorAll(`[data-row="${row}"] > [data-column]`) ?? [])].map(
        (cell) => cell.getAttribute('role'),
      )
    expect(roles(0)).toEqual(['gridcell', 'rowheader', 'gridcell'])
    expect(
      element.shadowRoot?.querySelector('[data-row="0"] > [data-column="1"]')?.getAttribute('part'),
    ).toBe('cell cell-header')
    ;(
      element.querySelectorAll('helix-headless-table-column')[1] as HTMLElement & {
        rowHeader: boolean
      }
    ).rowHeader = true
    ;(element as unknown as { requestUpdate: () => void }).requestUpdate()
    await settled(element)
    await settled(element)
    expect(roles(0)).toEqual(['gridcell', 'gridcell', 'rowheader'])
  })

  test('moves to the row whose header starts with the letters typed', async () => {
    const element = await start()
    await press(element, 'ArrowRight')
    await press(element, 'c')
    expect(place(focused(element))).toBe('2:1')
    // Typed on: "ch" is still charlie, the row it is on.
    await press(element, 'h')
    expect(place(focused(element))).toBe('2:1')
    await press(element, 'x')
    expect(place(focused(element))).toBe('2:1')
  })

  test('takes a Space typed in the middle of a search as part of it', async () => {
    const { element } = await mount(GRID, [
      { name: 'new jersey', size: 1 },
      { name: 'new york', size: 2 },
      { name: 'nevada', size: 3 },
    ])
    await settled(element)
    const stop = element.shadowRoot?.querySelector('[part="table"] [tabindex="0"]') as HTMLElement
    stop.focus()
    await settled(element)
    const grid = element as Grid
    for (const key of ['n', 'e', 'w', ' ', 'y']) {
      await press(grid, key)
    }
    expect(place(focused(grid))).toBe('1:0')
    expect(grid.selected).toBe('')
  })

  test('selects every row with Control or Command and A', async () => {
    const element = await start()
    await press(element, 'a', { ctrlKey: true })
    expect(element.selected.split(',').sort()).toEqual(['alpha', 'bravo', 'charlie', 'delta'])
  })

  test('writes the selection in the order of the rows, whatever order they were chosen in', async () => {
    const element = await start()
    const rowOrder = bodyRows(element).map(
      (row) => row.querySelector('[role="rowheader"]')?.textContent?.trim() ?? '',
    )
    const heard: string[] = []
    element.addEventListener('helix-select', (event) =>
      heard.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    await press(element, 'ArrowDown')
    await press(element, 'ArrowDown')
    await press(element, ' ')
    await press(element, 'a', { ctrlKey: true })
    expect(element.selected.split(',')).toEqual(rowOrder)
    expect(heard.at(-1)).toBe(rowOrder.join(','))
  })

  test('selects the rows Shift with Down crosses, and Shift with Space a range', async () => {
    const element = await start()
    await press(element, 'ArrowDown', { shiftKey: true })
    expect(element.selected.split(',').sort()).toEqual(['alpha', 'delta'])
    expect(place(focused(element))).toBe('1:0')
    await press(element, 'ArrowDown')
    await press(element, 'ArrowDown')
    await press(element, ' ', { shiftKey: true })
    expect(element.selected.split(',').sort()).toEqual(['alpha', 'bravo', 'charlie', 'delta'])
  })

  test('selects from the row last chosen with Shift on a checkbox', async () => {
    const element = await start()
    await press(element, ' ')
    expect(element.selected).toBe('delta')
    const box = element.shadowRoot?.querySelectorAll(
      '[part~="select"] [part="checkbox"]',
    )[2] as HTMLElement
    box.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, shiftKey: true }),
    )
    box.dispatchEvent(
      new CustomEvent('helix-before-toggle', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { checked: true },
      }),
    )
    await settled(element)
    expect(element.selected.split(',').sort()).toEqual(['alpha', 'charlie', 'delta'])
  })
})

describe('a row that asks for more', () => {
  const MORE = `
    <helix-headless-data-table label="Files" load-more load-more-label="Show more files">
      <helix-headless-table-column field="name">Name</helix-headless-table-column>
      <helix-headless-table-column field="size">Size</helix-headless-table-column>
    </helix-headless-data-table>`

  test('follows the rows, spans every column, and counts as a row', async () => {
    const { element } = await mount(MORE)
    await settled(element)
    const more = part(element, 'more') as HTMLElement
    expect(more.getAttribute('role')).toBe('row')
    const cell = part(element, 'more-cell') as HTMLElement
    expect(cell.getAttribute('aria-colspan')).toBe('2')
    expect(part(element, 'more-button')?.textContent).toBe('Show more files')
    expect(more.previousElementSibling?.getAttribute('part')).toBe('row')
    expect(grid(element).ariaRowCount).toBe('6')
  })

  test('sends helix-load-more from its button, and from Enter on its cell', async () => {
    const { element } = await mount(MORE)
    await settled(element)
    let asked = 0
    element.addEventListener('helix-load-more', () => {
      asked += 1
    })
    ;(part(element, 'more-button') as HTMLElement).click()
    expect(asked).toBe(1)
    const stop = element.shadowRoot?.querySelector('[part="table"] [tabindex="0"]') as HTMLElement
    stop.focus()
    await settled(element)
    for (let step = 0; step < 4; step += 1) {
      ;(element.shadowRoot?.activeElement as HTMLElement | null)?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowDown' }),
      )
      await settled(element)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    expect(element.shadowRoot?.activeElement?.getAttribute('part')).toBe('more-cell')
    ;(element.shadowRoot?.activeElement as HTMLElement | null)?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Enter' }),
    )
    expect(asked).toBe(2)
  })

  test('is not drawn while rows are loading, or when there are none', async () => {
    const { element } = await mount(MORE)
    ;(element as unknown as { loading: boolean }).loading = true
    await settled(element)
    expect(part(element, 'more')).toBeNull()
    ;(element as unknown as { loading: boolean }).loading = false
    element.rows = []
    await settled(element)
    expect(part(element, 'more')).toBeNull()
  })

  test('a windowed table asks by itself within a screen of the end, once for each length', async () => {
    /* The headless tier draws no box, so a browser is given the one a
       stylesheet would give it, through the part. An inline style on the part
       would not last: the template writes its `style` on every render. */
    const { element } = await mount(
      `${MORE.replace('load-more ', 'load-more windowed ')}
      <style>helix-headless-data-table::part(table) { block-size: 320px; overflow: auto; }</style>`,
      Array.from({ length: 50 }, (_, at) => ({ name: `row ${at}`, size: at })),
    )
    await settled(element)
    let asked = 0
    element.addEventListener('helix-load-more', () => {
      asked += 1
    })
    const box = part(element, 'table') as HTMLElement
    if (!hasLayout()) {
      Object.defineProperty(box, 'clientHeight', { configurable: true, value: 320 })
    }
    box.scrollTop = 0
    box.dispatchEvent(new Event('scroll'))
    expect(asked).toBe(0)
    box.scrollTop = 50 * 32 - 400
    box.dispatchEvent(new Event('scroll'))
    box.dispatchEvent(new Event('scroll'))
    // The browser's own scroll event as well, which asks nothing more.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(asked).toBe(1)
  })
})

describe('rows that hold rows', () => {
  const FILES = [
    {
      children: [
        { name: 'zeta.ts', size: 3 },
        { children: [{ name: 'deep.ts', size: 1 }], name: 'lib', size: 0 },
      ],
      name: 'src',
      size: 0,
    },
    { name: 'README.md', size: 2 },
  ]
  const TREE = `
    <helix-headless-data-table label="Files" child-field="children" row-key="name">
      <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
      <helix-headless-table-column field="size">Size</helix-headless-table-column>
    </helix-headless-data-table>`

  type Tree = Table & { expanded: string }

  const names = (element: HTMLElement) =>
    bodyRows(element).map((row) => row.querySelector('[role="rowheader"]')?.textContent?.trim())

  const key = async (element: Tree, cell: HTMLElement, name: string) => {
    cell.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key: name }))
    await settled(element)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await settled(element)
  }

  test('is a tree grid whose rows say their depth and whether they are open', async () => {
    const { element } = await mount(TREE, FILES)
    await settled(element)
    expect(grid(element).role).toBe('treegrid')
    expect(names(element)).toEqual(['src', 'README.md'])
    const [src, readme] = bodyRows(element)
    expect(src?.getAttribute('aria-level')).toBe('1')
    expect(src?.getAttribute('aria-expanded')).toBe('false')
    expect(src?.getAttribute('aria-setsize')).toBe('2')
    expect(readme?.hasAttribute('aria-expanded')).toBe(false)
  })

  test('opens a row from its button, and says so', async () => {
    const { element } = await mount(TREE, FILES)
    await settled(element)
    let heard = 0
    let said: unknown
    element.addEventListener('helix-expand', (event) => {
      heard += 1
      said = (event as CustomEvent<{ value: string }>).detail.value
    })
    const toggle = element.shadowRoot?.querySelector('[part~="toggle"]') as HTMLElement
    expect(toggle.getAttribute('aria-hidden')).toBe('true')
    toggle.click()
    await settled(element)
    expect((element as Tree).expanded).toBe('src')
    expect(heard).toBe(1)
    expect(said).toBe('src')
    expect(names(element)).toEqual(['src', 'zeta.ts', 'lib', 'README.md'])
    expect(bodyRows(element)[2]?.getAttribute('aria-level')).toBe('2')
    const cell = element.shadowRoot?.querySelector(
      '[data-row="2"] [role="rowheader"]',
    ) as HTMLElement
    expect(cell.getAttribute('style')).toContain('--data-table-level: 2')
  })

  test('holds the open rows in row order, and takes a key that holds a space', async () => {
    const { element } = await mount(TREE, [
      { children: [{ name: 'a.ts', size: 1 }], name: 'my notes', size: 0 },
      ...FILES,
    ])
    await settled(element)
    const tree = element as Tree
    const toggles = () => [
      ...(element.shadowRoot?.querySelectorAll<HTMLElement>('[part~="toggle"]') ?? []),
    ]
    // src is the second branch: open it first, then the one above it.
    toggles()[1]?.click()
    await settled(element)
    toggles()[0]?.click()
    await settled(element)
    expect(tree.expanded).toBe('my notes,src')
    expect(names(element)).toContain('a.ts')
  })

  test('opens with Right, closes with Left, and goes to the parent with Left', async () => {
    const { element } = await mount(TREE, FILES)
    await settled(element)
    const tree = element as Tree
    const header = (row: number) =>
      element.shadowRoot?.querySelector(`[data-row="${row}"] [role="rowheader"]`) as HTMLElement
    header(0).focus()
    await key(tree, header(0), 'ArrowRight')
    expect(tree.expanded).toBe('src')
    header(2).focus()
    await key(tree, header(2), 'ArrowLeft')
    expect(element.shadowRoot?.activeElement).toBe(header(0))
    await key(tree, header(0), 'ArrowLeft')
    expect(tree.expanded).toBe('')
    expect(names(element)).toEqual(['src', 'README.md'])
  })

  test('sorts the rows under each parent, and keeps them there', async () => {
    const { element } = await mount(
      TREE.replace('row-key="name"', 'row-key="name" default-expanded="src,lib" sort="name:desc"'),
      FILES,
    )
    await settled(element)
    expect(names(element)).toEqual(['src', 'zeta.ts', 'lib', 'deep.ts', 'README.md'])
  })

  test('a search shows the rows that lead to a match, open', async () => {
    const { element } = await mount(TREE, FILES)
    await settled(element)
    element.search('deep')
    await settled(element)
    expect(names(element)).toEqual(['src', 'lib', 'deep.ts'])
  })

  test('the box in the heading selects every row, those under closed rows too', async () => {
    const { element } = await mount(
      TREE.replace('row-key="name"', 'row-key="name" selectable'),
      FILES,
    )
    await settled(element)
    ;(
      element.shadowRoot?.querySelector(
        '[part="select-all"] [part="checkbox"]',
      ) as HTMLElement | null
    )?.dispatchEvent(
      new CustomEvent('helix-before-toggle', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { checked: true },
      }),
    )
    await settled(element)
    expect((element as Tree & { selected: string }).selected.split(',').sort()).toEqual([
      'README.md',
      'deep.ts',
      'lib',
      'src',
      'zeta.ts',
    ])
  })
})
