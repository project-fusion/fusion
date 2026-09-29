import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'

/* What a reader arranges: which rows are chosen, which order the columns sit in,
   how wide one is, and what leaves as CSV. Each is the table's to hold and the
   consumer's to refuse, so every one is asked before it is applied. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  csv: () => string
  order: string
  page: number
  rows: readonly Record<string, unknown>[]
  selected: string
  sort: string
  updateComplete: Promise<unknown>
}

type Box = HTMLElement & {
  requestChecked: (next: boolean) => boolean
  checked: boolean
  indeterminate: boolean
}

const ROWS = [
  { id: 'd', name: 'delta', size: 200 },
  { id: 'a', name: 'alpha', size: 30 },
  { id: 'c', name: 'charlie', size: 1000 },
  { id: 'b', name: 'bravo', size: 4 },
]

const table = async (attrs: string, columns?: string): Promise<Table> => {
  const element = (await mountMarkup(`<helix-headless-data-table ${attrs}>
    ${
      columns ??
      `<helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
       <helix-headless-table-column field="size" align="end">Size</helix-headless-table-column>`
    }
  </helix-headless-data-table>`)) as Table
  element.rows = ROWS
  await element.updateComplete
  await element.updateComplete
  return element
}

const shadow = (element: HTMLElement, selector: string): HTMLElement[] => [
  ...(element.shadowRoot?.querySelectorAll<HTMLElement>(selector) ?? []),
]
const cells = (element: HTMLElement): string[] =>
  shadow(element, '[part~="cell"]').map((cell) => cell.textContent?.trim() ?? '')
const boxes = (element: HTMLElement): Box[] => shadow(element, '[part="checkbox"]') as Box[]

describe('selection', () => {
  test('puts a checkbox before every row and one in the heading', async () => {
    const element = await table('selectable row-key="id"')
    expect(shadow(element, '[part="select-all"] [part="checkbox"]')).toHaveLength(1)
    expect(shadow(element, '[part~="select"] [part="checkbox"]')).toHaveLength(4)
  })

  test('selects by key, so the choice follows the row through a sort', async () => {
    const element = await table('selectable row-key="id"')
    const seen: string[] = []
    element.addEventListener('helix-select', (event) =>
      seen.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    boxes(element)[1]?.requestChecked(true)
    await element.updateComplete
    expect(element.selected).toBe('d')
    expect(seen).toEqual(['d'])
    element.sort = 'name:asc'
    await element.updateComplete
    const rows = shadow(element, '[part="row"]')
    const chosen = rows.filter((row) => row.getAttribute('aria-selected') === 'true')
    expect(chosen.map((row) => row.querySelector('[part~="cell"]')?.textContent?.trim())).toEqual([
      'delta',
    ])
  })

  test('refusing the choice leaves the selection as it was', async () => {
    const element = await table('selectable row-key="id" default-selected="a"')
    element.addEventListener('helix-select', (event) => event.preventDefault())
    boxes(element)[1]?.requestChecked(true)
    await element.updateComplete
    expect(element.selected).toBe('a')
    expect(boxes(element)[1]?.checked).toBe(false)
  })

  test('the heading selects every row of the result, across pages, and clears them again', async () => {
    const element = await table('selectable row-key="id" page-size="2"')
    boxes(element)[0]?.requestChecked(true)
    await element.updateComplete
    expect(element.selected.split(',').sort()).toEqual(['a', 'b', 'c', 'd'])
    boxes(element)[0]?.requestChecked(false)
    await element.updateComplete
    expect(element.selected).toBe('')
  })

  test('the heading shows a dash while only some rows are chosen', async () => {
    const element = await table('selectable row-key="id" default-selected="a,c"')
    expect(boxes(element)[0]?.indeterminate).toBe(true)
    expect(boxes(element)[0]?.checked).toBe(false)
  })

  test('says the grid takes more than one choice, and each row whether it is one', async () => {
    const element = await table('selectable row-key="id" default-selected="b"')
    const internals = (element as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaMultiSelectable).toBe('true')
    expect(shadow(element, '[part="row"]').map((row) => row.getAttribute('aria-selected'))).toEqual(
      ['false', 'false', 'false', 'true'],
    )
  })

  test('and paints it by part name, on the cells, since the row takes no box', async () => {
    const element = await table('selectable row-key="id" default-selected="b"')
    expect(
      shadow(element, '[part~="cell-selected"]').map((cell) => cell.textContent?.trim()),
    ).toEqual(['bravo', '4'])
    expect(shadow(element, '[part~="select-selected"]')).toHaveLength(1)
    element.selected = ''
    await element.updateComplete
    expect(shadow(element, '[part~="cell-selected"]')).toHaveLength(0)
  })

  test('a checked box’s mark says so in a part name, which the table forwards', async () => {
    const element = await table('selectable row-key="id" default-selected="a,c"')
    const mark = (box?: Box): string =>
      box?.shadowRoot?.querySelector('[part~="mark"]')?.getAttribute('part') ?? ''
    expect(mark(boxes(element)[0])).toBe('mark mark-indeterminate')
    expect(mark(boxes(element)[2])).toBe('mark mark-checked')
    expect(mark(boxes(element)[1])).toBe('mark')
    expect(boxes(element)[0]?.getAttribute('exportparts')).toContain(
      'mark-checked: checkbox-mark-checked',
    )
  })

  test('names each checkbox for the row it chooses', async () => {
    /* In the `<label>` around the box's input, which is where its name comes
       from. The attribute on the host alone names nothing: measured in
       Chromium, every row's box was a checkbox with no name. */
    const element = await table('selectable row-key="id"')
    const words = (box?: Box): string =>
      box?.shadowRoot?.querySelector('[part="label"]')?.textContent?.trim() ?? ''
    expect(boxes(element)[1]?.getAttribute('aria-label')).toBe('Select delta')
    expect(words(boxes(element)[1])).toBe('Select delta')
    expect(words(boxes(element)[0])).toBe('Select every row')
  })
})

describe('column order', () => {
  test('draws the headings and the cells in the order asked for', async () => {
    const element = await table('default-order="size name"')
    expect(cells(element).slice(0, 2)).toEqual(['200', 'delta'])
    const slot = element.shadowRoot?.querySelector('slot[name="columns"]') as HTMLSlotElement
    expect(slot.assignedElements().map((column) => column.getAttribute('field'))).toEqual([
      'size',
      'name',
    ])
  })

  test('leaves the consumer’s markup where it was written', async () => {
    const element = await table('default-order="size name"')
    expect(
      [...element.querySelectorAll('helix-headless-table-column')].map((c) =>
        c.getAttribute('field'),
      ),
    ).toEqual(['name', 'size'])
  })

  test('puts a grip on each heading only when the table lets a reader move them', async () => {
    expect(
      (await table(''))
        .querySelector('helix-headless-table-column')
        ?.shadowRoot?.querySelector('[part="grip"]'),
    ).toBeNull()
    const movable = await table('reorderable')
    expect(
      movable
        .querySelector('helix-headless-table-column')
        ?.shadowRoot?.querySelector('[part="grip"]')
        ?.getAttribute('aria-label'),
    ).toBe('Move Name')
  })

  test('an arrow on a grip asks to move its column a place, and refusing keeps it', async () => {
    const element = await table('reorderable')
    const seen: string[] = []
    element.addEventListener('helix-reorder', (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    const grip = element
      .querySelector('helix-headless-table-column')
      ?.shadowRoot?.querySelector('[part="grip"]') as HTMLElement
    grip.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowRight' }),
    )
    await element.updateComplete
    expect(seen).toEqual(['size name'])
    expect(element.order).toBe('size name')

    element.addEventListener('helix-reorder', (event) => event.preventDefault())
    const moved = element
      .querySelector('helix-headless-table-column[field="name"]')
      ?.shadowRoot?.querySelector('[part="grip"]') as HTMLElement
    moved.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowLeft' }),
    )
    await element.updateComplete
    expect(element.order).toBe('size name')
  })

  /* Counted among all of them, the step went past the hidden column: the order
     changed and nothing a reader could see moved. The hidden one keeps its
     place among the rest. */
  test('an arrow moves a column past the next one a reader can see', async () => {
    const element = await table(
      'reorderable',
      `<helix-headless-table-column field="name">Name</helix-headless-table-column>
       <helix-headless-table-column field="id" hidden>Id</helix-headless-table-column>
       <helix-headless-table-column field="size">Size</helix-headless-table-column>`,
    )
    const grip = element
      .querySelector('helix-headless-table-column')
      ?.shadowRoot?.querySelector('[part="grip"]') as HTMLElement
    grip.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowRight' }),
    )
    await element.updateComplete
    expect(element.order).toBe('id size name')
    expect(cells(element).slice(0, 2)).toEqual(['200', 'delta'])
  })

  test('a click on a grip does not sort the column', async () => {
    const element = await table('reorderable')
    const grip = element
      .querySelector('helix-headless-table-column')
      ?.shadowRoot?.querySelector('[part="grip"]') as HTMLElement
    grip.click()
    await element.updateComplete
    expect(element.sort).toBe('')
  })
})

describe('a sortable heading', () => {
  test('is a button inside the header, which is what the keyboard can reach', async () => {
    const element = await table('')
    const sort = element
      .querySelector('helix-headless-table-column')
      ?.shadowRoot?.querySelector('[part="sort"]')
    expect(sort?.localName).toBe('button')
    const plain = element
      .querySelector('helix-headless-table-column[field="size"]')
      ?.shadowRoot?.querySelector('[part="sort"]')
    expect(plain).toBeNull()
  })
})

describe('column width', () => {
  test('a resizable column carries a separator named for it', async () => {
    const element = await table(
      '',
      '<helix-headless-table-column field="name" resizable>Name</helix-headless-table-column>',
    )
    const resizer = element
      .querySelector('helix-headless-table-column')
      ?.shadowRoot?.querySelector('[part="resizer"]') as HTMLElement
    expect([resizer.getAttribute('role'), resizer.getAttribute('aria-label')]).toEqual([
      'separator',
      'Resize Name',
    ])
  })

  test('Home asks for the narrowest width, and refusing keeps the width it had', async () => {
    const element = await table(
      '',
      '<helix-headless-table-column field="name" resizable width="12rem">Name</helix-headless-table-column>',
    )
    const column = element.querySelector('helix-headless-table-column') as HTMLElement & {
      width: string
      updateComplete: Promise<unknown>
    }
    const resizer = column.shadowRoot?.querySelector('[part="resizer"]') as HTMLElement
    const seen: string[] = []
    element.addEventListener('helix-before-resize', (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    resizer.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Home' }),
    )
    expect(seen).toEqual(['48px'])
    expect(column.width).toBe('48px')

    column.width = '12rem'
    element.addEventListener('helix-before-resize', (event) => event.preventDefault())
    resizer.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Home' }),
    )
    expect(column.width).toBe('12rem')
  })
})

describe('csv', () => {
  test('is the result in the order and the columns on screen, headed by the headings', async () => {
    const element = await table('default-sort="name:asc" default-order="size name"')
    expect(element.csv().split('\r\n')).toEqual([
      'Size,Name',
      '30,alpha',
      '4,bravo',
      '1000,charlie',
      '200,delta',
    ])
  })

  test('leaves out a hidden column, which is not on screen', async () => {
    const element = await table(
      'default-sort="name:asc"',
      `<helix-headless-table-column field="name">Name</helix-headless-table-column>
       <helix-headless-table-column field="id" hidden>Id</helix-headless-table-column>
       <helix-headless-table-column field="size">Size</helix-headless-table-column>`,
    )
    expect(element.csv().split('\r\n').slice(0, 2)).toEqual(['Name,Size', 'alpha,30'])
  })

  test('quotes what CSV has to quote, and marks what a spreadsheet would run as text', async () => {
    const element = await table('')
    element.rows = [
      { name: 'a, "quoted" name', size: -5 },
      { name: '=HYPERLINK("x")', size: 1 },
    ]
    await element.updateComplete
    expect(element.csv().split('\r\n')).toEqual([
      'Name,Size',
      '"a, ""quoted"" name",-5',
      '"\'=HYPERLINK(""x"")",1',
    ])
  })
})
