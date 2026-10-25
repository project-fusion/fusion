import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { internalsOf, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* Rows moved by a grip, with `reorderable-rows`. The table moves no row: the
   specs that move one set `rows` to the order `helix-reorder` carries, as a
   page would. Column grips are `data-table-arrange.dom.spec.ts`'s. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  order: string
  reorderableRows: boolean
  rows: readonly Record<string, unknown>[]
  sort: string
  updateComplete: Promise<unknown>
}

interface Detail {
  from: number
  key: string
  keys: string[]
  kind: string
  to: number
  value: string
}

const ROWS = [
  { id: 'a', name: 'alpha', size: 30 },
  { id: 'b', name: 'bravo', size: 4 },
  { id: 'c', name: 'charlie', size: 1000 },
]

const tables: Table[] = []
/* And a task, because a pointer's release swallows the click it raises until
   the next one. A dispatched `pointerup` raises no click, so without the wait
   the guard was still standing for the next spec's click, and a sortable
   heading in `data-table-root.dom.spec.ts` did not sort. */
afterEach(async () => {
  for (const one of tables.splice(0)) {
    one.remove()
  }
  await new Promise((done) => setTimeout(done, 0))
})

const settle = async (element: Table): Promise<void> => {
  for (let round = 0; round < 3; round += 1) {
    await element.updateComplete
  }
}

const table = async (attrs: string): Promise<Table> => {
  const element = (await mount(`<helix-headless-data-table label="Files" row-key="id" ${attrs}>
    <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
    <helix-headless-table-column field="size">Size</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  tables.push(element)
  element.rows = ROWS
  await settle(element)
  return element
}

const shadow = (element: HTMLElement, selector: string): HTMLElement[] => [
  ...(element.shadowRoot?.querySelectorAll<HTMLElement>(selector) ?? []),
]
const grips = (element: Table): HTMLElement[] => shadow(element, '[part="row-grip"]')
const names = (element: Table): string[] =>
  shadow(element, '[part~="cell-header"]').map((cell) => cell.textContent?.trim() ?? '')

const press = (target: Element, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  target.dispatchEvent(event)
  return event
}

const spoken = async (element: Table): Promise<string> => {
  await new Promise((done) => requestAnimationFrame(() => done(undefined)))
  await settle(element)
  return shadow(element, '[part="live"]')[0]?.textContent?.trim() ?? ''
}

/** Sets `rows` to each order asked for, as a page would. */
const follow = (element: Table): Detail[] => {
  const heard: Detail[] = []
  element.addEventListener('helix-reorder', (event) => {
    const detail = (event as CustomEvent<Detail>).detail
    heard.push(detail)
    if (detail.kind === 'row') {
      element.rows = detail.keys.map((key) => ROWS.find((row) => row.id === key) ?? {})
    }
  })
  return heard
}

/* A pointer event as a mouse sends it, where `y` says how far down. */
const pointer = (target: EventTarget, type: string, y: number): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: 5,
      clientY: y,
      composed: true,
      pointerId: 1,
    }),
  )
}

const pressEscape = (): void => {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }),
  )
}

describe('a table without reorderable-rows', () => {
  test('draws no grips and no drag preview, and leads each row with its first column', async () => {
    const element = await table('reorderable')
    expect(grips(element)).toEqual([])
    expect(shadow(element, '[part="grip-head"]')).toEqual([])
    /* A column's grip moves the column itself, so `reorderable` alone draws none. */
    expect(part(element, 'drag-preview')).toBeNull()
    expect(
      shadow(element, '[part~="row"]')[0]?.firstElementChild?.getAttribute('data-column'),
    ).toBe('0')
  })
})

describe('a table with reorderable-rows', () => {
  test('leads each row with a grip named after it, under a named heading', async () => {
    const element = await table('reorderable-rows selectable')
    expect(grips(element)).toHaveLength(3)
    const button = grips(element)[0]?.querySelector('[part="row-grip-button"]')
    expect(button?.getAttribute('aria-label')).toBe('Move alpha')
    expect(grips(element)[0]?.getAttribute('role')).toBe('gridcell')
    const head = shadow(element, '[part="grip-head"]')[0]
    expect(head?.getAttribute('role')).toBe('columnheader')
    expect(head?.getAttribute('aria-label')).toBe('Move rows')
    /* The grips are the first column and the checkboxes the second. */
    expect(grips(element)[0]?.dataset.column).toBe('0')
    expect(shadow(element, '[part~="select"]')[0]?.dataset.column).toBe('1')
    expect(shadow(element, '[part="select-all"]')[0]?.dataset.column).toBe('1')
    /* The grips, the checkboxes and the two columns. */
    expect(internalsOf(element).ariaColCount).toBe('4')
  })

  test('picks up a row with Space, moves it with the arrows, and drops it with Enter', async () => {
    const element = await table('reorderable-rows')
    const asked: Detail[] = []
    element.addEventListener('helix-before-reorder', (event) =>
      asked.push((event as CustomEvent<Detail>).detail),
    )
    const heard = follow(element)
    const first = grips(element)[0] as HTMLElement
    first.focus()
    const space = press(first, ' ')
    expect(space.defaultPrevented).toBe(true)
    expect(await spoken(element)).toBe('Picked up alpha')
    press(first, 'ArrowDown')
    expect(await spoken(element)).toBe('alpha moved to position 2 of 3')
    expect(shadow(element, '[part~="row-dragging"]')).toHaveLength(1)
    expect(shadow(element, '[part~="row-drop-after"]')[0]?.dataset.row).toBe('1')
    press(first, 'Enter')
    await settle(element)
    const detail = { from: 0, key: 'a', keys: ['b', 'a', 'c'], kind: 'row', to: 1, value: 'b,a,c' }
    expect(asked).toEqual([detail])
    expect(heard).toEqual([detail])
    expect(names(element)).toEqual(['bravo', 'alpha', 'charlie'])
    expect(await spoken(element)).toBe('Dropped')
    expect(shadow(element, '[part~="row-dragging"]')).toEqual([])
  })

  test('keeps the arrows from moving between cells while a row is held', async () => {
    const element = await table('reorderable-rows')
    const first = grips(element)[0] as HTMLElement
    first.focus()
    press(first, 'Enter')
    const down = press(first, 'ArrowDown')
    expect(down.defaultPrevented).toBe(true)
    await settle(element)
    expect(element.shadowRoot?.activeElement).toBe(first)
  })

  test('Escape puts the row back and asks for nothing', async () => {
    const element = await table('reorderable-rows')
    const heard = follow(element)
    const last = grips(element)[2] as HTMLElement
    last.focus()
    press(last, ' ')
    press(last, 'Home')
    press(last, 'Escape')
    expect(heard).toEqual([])
    expect(await spoken(element)).toBe('Canceled')
  })

  test('a refused move leaves the rows and is said as canceled', async () => {
    const element = await table('reorderable-rows')
    element.addEventListener('helix-before-reorder', (event) => event.preventDefault())
    const heard = follow(element)
    const first = grips(element)[0] as HTMLElement
    first.focus()
    press(first, ' ')
    press(first, 'End')
    press(first, ' ')
    expect(heard).toEqual([])
    expect(await spoken(element)).toBe('Canceled')
  })

  test('a click on the grip picks the row up, and a click on another row drops it there', async () => {
    const element = await table('reorderable-rows')
    const heard = follow(element)
    const third = grips(element)[2] as HTMLElement
    ;(third.querySelector('[part="row-grip-button"]') as HTMLElement).click()
    expect(await spoken(element)).toBe('Picked up charlie')
    shadow(element, '[part~="cell"]')[0]?.click()
    await settle(element)
    expect(heard.map((one) => one.keys)).toEqual([['c', 'a', 'b']])
  })

  test('does nothing while a sort decides the order, and says so on the grip', async () => {
    const element = await table('reorderable-rows sort="name:desc"')
    const heard = follow(element)
    const first = grips(element)[0] as HTMLElement
    expect(first.querySelector('[part="row-grip-button"]')?.getAttribute('aria-disabled')).toBe(
      'true',
    )
    first.focus()
    press(first, 'Enter')
    press(first, 'ArrowDown')
    press(first, 'Enter')
    expect(heard).toEqual([])
  })

  test('the words are the page’s to change', async () => {
    const element = await table(
      'reorderable-rows move-row-label="Drag {row}" picked-up-label="Holding {name}" row-grips-label="Order"',
    )
    expect(
      grips(element)[1]?.querySelector('[part="row-grip-button"]')?.getAttribute('aria-label'),
    ).toBe('Drag bravo')
    expect(shadow(element, '[part="grip-head"]')[0]?.getAttribute('aria-label')).toBe('Order')
    const second = grips(element)[1] as HTMLElement
    second.focus()
    press(second, ' ')
    expect(await spoken(element)).toBe('Holding bravo')
  })
})

describe('a column dragged by its grip', () => {
  test('still asks with helix-reorder, now saying which field moved and where', async () => {
    const element = await table('reorderable')
    const heard = follow(element)
    const grip = element
      .querySelector('helix-headless-table-column')
      ?.shadowRoot?.querySelector('[part="grip"]') as HTMLElement
    grip.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowRight' }),
    )
    await settle(element)
    expect(heard).toEqual([
      { from: 0, key: 'name', keys: ['size', 'name'], kind: 'column', to: 1, value: 'size name' },
    ])
    expect(element.order).toBe('size name')
  })

  test('an arrow moves a column past the heading beside it, and a hidden one between keeps its side', async () => {
    const element = (await mount(`<helix-headless-data-table label="Files" reorderable>
      <helix-headless-table-column field="a">A</helix-headless-table-column>
      <helix-headless-table-column field="x" hidden>X</helix-headless-table-column>
      <helix-headless-table-column field="b">B</helix-headless-table-column>
      <helix-headless-table-column field="c">C</helix-headless-table-column>
    </helix-headless-data-table>`)) as Table
    tables.push(element)
    await settle(element)
    const grip = element
      .querySelector('helix-headless-table-column[field="c"]')
      ?.shadowRoot?.querySelector('[part="grip"]') as HTMLElement
    grip.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowLeft' }),
    )
    await settle(element)
    expect(element.order).toBe('a x c b')
  })
})

describe('a pointer dragging a row by its grip', () => {
  test('draws a copy of it in the drag-preview part, hidden from assistive technology, which follows the pointer until the drop', async () => {
    const element = await table('reorderable-rows')
    const grip = grips(element)[1] as HTMLElement
    /* Drawn by the template, empty and closed, until a pointer drags. */
    expect(part(element, 'drag-preview')?.childElementCount).toBe(0)
    pointer(grip.querySelector('button') as HTMLElement, 'pointerdown', 5)
    pointer(window, 'pointermove', 25)
    const preview = part(element, 'drag-preview') as HTMLElement
    expect(preview.getAttribute('aria-hidden')).toBe('true')
    expect(preview.getAttribute('popover')).toBe('manual')
    expect(preview.textContent).toContain('bravo')
    expect(preview.style.getPropertyValue('translate')).toBe('0px 20px')
    pointer(window, 'pointermove', 40)
    expect(preview.style.getPropertyValue('translate')).toBe('0px 35px')
    pointer(window, 'pointerup', 40)
    expect(part(element, 'drag-preview')?.childElementCount ?? 0).toBe(0)
  })

  test('Escape takes the copy away and puts it back, and a move with the keys draws none', async () => {
    const element = await table('reorderable-rows')
    const grip = grips(element)[1] as HTMLElement
    let asked = 0
    element.addEventListener('helix-before-reorder', () => {
      asked += 1
    })
    pointer(grip.querySelector('button') as HTMLElement, 'pointerdown', 5)
    pointer(window, 'pointermove', 25)
    pressEscape()
    expect(part(element, 'drag-preview')?.childElementCount ?? 0).toBe(0)
    pointer(window, 'pointerup', 25)
    expect(asked).toBe(0)
    press(grip, ' ')
    press(grip, 'ArrowDown')
    await settle(element)
    expect(part(element, 'drag-preview')?.childElementCount ?? 0).toBe(0)
  })
})
