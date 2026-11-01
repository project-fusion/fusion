import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'

/* The menu on a heading. The table holds the sort, the order, and which columns
   are hidden, so each row asks the table, and a press anywhere else on the
   heading still sorts. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  hideColumn: (field: string) => boolean
  order: string
  rows: readonly Record<string, unknown>[]
  showColumn: (field: string) => boolean
  sort: string
  updateComplete: Promise<unknown>
}

type Column = HTMLElement & { updateComplete: Promise<unknown> }

const ROWS = [
  { kind: 'font', name: 'alpha', size: 30 },
  { kind: 'image', name: 'bravo', size: 4 },
]

const table = async (attrs = ''): Promise<Table> => {
  const element = (await mountMarkup(`<helix-headless-data-table ${attrs} label="Assets">
    <helix-headless-table-column field="name" menu sortable>Name</helix-headless-table-column>
    <helix-headless-table-column field="size" menu>Size</helix-headless-table-column>
    <helix-headless-table-column field="kind">Kind</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  element.rows = ROWS
  await settle(element)
  return element
}

const settle = async (element: Table): Promise<void> => {
  for (let turn = 0; turn < 4; turn += 1) {
    await element.updateComplete
    await Promise.all(columns(element).map((column) => column.updateComplete))
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const columns = (element: Table): Column[] => [
  ...element.querySelectorAll<Column>('helix-headless-table-column'),
]
const column = (element: Table, field: string): Column =>
  element.querySelector(`[field="${field}"]`) as Column
const button = (element: Table, field: string): HTMLElement | null =>
  column(element, field).shadowRoot?.querySelector('[part="menu-button"]') ?? null
const menu = (element: Table, field: string): Element | null =>
  column(element, field).shadowRoot?.querySelector('helix-headless-menu') ?? null
const row = (element: Table, field: string, value: string): HTMLElement =>
  column(element, field).shadowRoot?.querySelector(`[value="${value}"]`) as HTMLElement
const values = (element: Table, field: string): string[] =>
  [...(menu(element, field)?.querySelectorAll('helix-headless-menu-item') ?? [])].map(
    (one) => one.getAttribute('value') ?? '',
  )
const choose = async (element: Table, field: string, value: string): Promise<void> => {
  row(element, field, value).click()
  await settle(element)
}

describe('a column menu', () => {
  /* Opt-in, so a heading stays quiet by default. */
  test('draws a button only on a column that sets menu', async () => {
    const element = await table()
    expect(button(element, 'name')).not.toBeNull()
    expect(button(element, 'kind')).toBeNull()
  })

  test('names the button after the heading, and keeps the heading named by its words', async () => {
    const element = await table()
    expect(button(element, 'name')?.getAttribute('aria-label')).toBe('Name column menu')
    const heading = column(element, 'name').shadowRoot?.querySelector('[part="column"]')
    expect(heading?.getAttribute('aria-label')).toBe('Name')
  })

  test('offers what the column can do', async () => {
    const element = await table('reorderable')
    expect(values(element, 'name')).toEqual(['ascending', 'descending', 'left', 'right', 'hide'])
    expect(values(element, 'size')).toEqual(['left', 'right', 'hide'])
  })

  test('leaves out moving where the table is not reorderable', async () => {
    const element = await table()
    expect(values(element, 'name')).toEqual(['ascending', 'descending', 'hide'])
  })

  /* A press on the button opens the menu, and on the words it sorts. */
  test('a press on the button does not sort, and a press on the heading does', async () => {
    const element = await table()
    button(element, 'name')?.click()
    await settle(element)
    expect(element.sort).toBe('')
    column(element, 'name').shadowRoot?.querySelector<HTMLElement>('[part="sort"]')?.click()
    await settle(element)
    expect(element.sort).toBe('name:asc')
  })

  test('sorts each way, marks the row for the direction, and asks first', async () => {
    const element = await table()
    const asked: string[] = []
    element.addEventListener('helix-before-sort', (event) => {
      asked.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await choose(element, 'name', 'descending')
    expect(element.sort).toBe('name:desc')
    expect((row(element, 'name', 'descending') as unknown as { checked: boolean }).checked).toBe(
      true,
    )
    await choose(element, 'name', 'ascending')
    expect(element.sort).toBe('name:asc')
    expect((row(element, 'name', 'descending') as unknown as { checked: boolean }).checked).toBe(
      false,
    )
    /* The row already on asks nothing. */
    await choose(element, 'name', 'ascending')
    expect(asked).toEqual(['name:desc', 'name:asc'])
  })

  test('keeps the row off where the sort was refused', async () => {
    const element = await table()
    element.addEventListener('helix-before-sort', (event) => event.preventDefault())
    await choose(element, 'name', 'descending')
    expect(element.sort).toBe('')
    expect((row(element, 'name', 'descending') as unknown as { checked: boolean }).checked).toBe(
      false,
    )
  })

  /* `helix-select` from a menu row is not a row selection. */
  test('sends none of the menu events out of the table', async () => {
    const element = await table()
    const heard: string[] = []
    for (const name of [
      'helix-before-check',
      'helix-before-close',
      'helix-before-open',
      'helix-before-select',
      'helix-select',
    ]) {
      element.addEventListener(name, () => heard.push(name))
    }
    button(element, 'name')?.click()
    await settle(element)
    await choose(element, 'name', 'descending')
    expect(heard).toEqual([])
  })

  test('moves the column a place, and disables the row at the edge', async () => {
    const element = await table('reorderable')
    expect(row(element, 'name', 'left').hasAttribute('disabled')).toBe(true)
    expect(row(element, 'name', 'right').hasAttribute('disabled')).toBe(false)
    await choose(element, 'name', 'right')
    expect(element.order).toBe('size name kind')
    expect(row(element, 'name', 'left').hasAttribute('disabled')).toBe(false)
  })

  test('Move left goes toward the left edge on a right-to-left page', async () => {
    const element = await table('reorderable dir="rtl"')
    expect(row(element, 'name', 'left').hasAttribute('disabled')).toBe(false)
    expect(row(element, 'name', 'right').hasAttribute('disabled')).toBe(true)
    await choose(element, 'name', 'left')
    expect(element.order).toBe('size name kind')
  })

  test('hides the column, asks first, says so, and shows it again', async () => {
    const element = await table()
    const heard: { field: string; hidden: boolean; type: string }[] = []
    for (const name of ['helix-before-column-toggle', 'helix-column-toggle']) {
      element.addEventListener(name, (event) => {
        heard.push({ ...(event as CustomEvent).detail, type: event.type })
      })
    }
    expect(values(element, 'size')).not.toContain('restore')
    await choose(element, 'name', 'hide')
    expect(column(element, 'name').hasAttribute('hidden')).toBe(true)
    expect(heard).toEqual([
      { field: 'name', hidden: true, type: 'helix-before-column-toggle' },
      { field: 'name', hidden: true, type: 'helix-column-toggle' },
    ])
    await choose(element, 'size', 'restore')
    expect(column(element, 'name').hasAttribute('hidden')).toBe(false)
    expect(values(element, 'size')).not.toContain('restore')
  })

  test('keeps the column where the hide was refused', async () => {
    const element = await table()
    element.addEventListener('helix-before-column-toggle', (event) => event.preventDefault())
    await choose(element, 'name', 'hide')
    expect(column(element, 'name').hasAttribute('hidden')).toBe(false)
    expect(values(element, 'size')).not.toContain('restore')
  })

  /* A table with no columns drawn has no heading left to bring them back from. */
  test('keeps the last column showing', async () => {
    const element = await table()
    expect(element.hideColumn('kind')).toBe(true)
    expect(element.hideColumn('name')).toBe(true)
    await settle(element)
    expect(row(element, 'size', 'hide').hasAttribute('disabled')).toBe(true)
    expect(element.hideColumn('size')).toBe(false)
  })

  /* A column you hid with `hidden` is yours, and may be hidden for a reason. */
  test('brings back only what it hid', async () => {
    const element = await table()
    column(element, 'kind').setAttribute('hidden', '')
    await settle(element)
    expect(values(element, 'size')).not.toContain('restore')
    await choose(element, 'name', 'hide')
    await choose(element, 'size', 'restore')
    expect(column(element, 'name').hasAttribute('hidden')).toBe(false)
    expect(column(element, 'kind').hasAttribute('hidden')).toBe(true)
  })

  test('hideColumn and showColumn do nothing for a column already that way', async () => {
    const element = await table()
    expect(element.showColumn('name')).toBe(false)
    expect(element.hideColumn('missing')).toBe(false)
    expect(element.hideColumn('name')).toBe(true)
    expect(element.hideColumn('name')).toBe(false)
    expect(element.showColumn('name')).toBe(true)
  })

  /* In the grid the button leaves the tab order with the heading's other controls. */
  test('the button is reached as a control of the heading', async () => {
    const element = await table()
    expect(button(element, 'name')?.getAttribute('tabindex')).toBe('-1')
    const controls = (column(element, 'name') as unknown as { controls: HTMLElement[] }).controls
    expect(controls.map((one) => one.getAttribute('part'))).toEqual(['sort', 'menu-button'])
  })

  /* A Table holds no hide or move, so the setting draws nothing there. */
  test('a Table ignores menu', async () => {
    const element = (await mountMarkup(`<helix-headless-table>
      <helix-headless-table-column field="name" menu sortable>Name</helix-headless-table-column>
    </helix-headless-table>`)) as HTMLElement & { updateComplete: Promise<unknown> }
    await element.updateComplete
    const head = element.querySelector('helix-headless-table-column') as Column
    await head.updateComplete
    expect(head.shadowRoot?.querySelector('[part="menu-button"]')).toBeNull()
  })

  /* Unset, the column writes nothing it did not write before. */
  test('a heading without the setting holds no menu', async () => {
    const element = await table()
    expect(column(element, 'kind').shadowRoot?.querySelector('helix-headless-menu')).toBeNull()
  })
})
