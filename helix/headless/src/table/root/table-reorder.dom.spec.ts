import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* A `reorderable` table: a grip cell before each row's cells, moved by the
   keys, a click, or a pointer, with each step said in the table's live
   region. The page moves the rows, so the specs that move one answer
   `helix-reorder` as a page would. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updating = HTMLElement & { updateComplete: Promise<boolean> }

interface Table extends Updating {
  sort: string
}

interface Detail {
  from: number
  key: string
  keys: string[]
  kind: string
  to: number
  value: string
}

const tables: Table[] = []
afterEach(() => {
  for (const one of tables.splice(0)) {
    one.remove()
  }
})

/* An update, and then the observer's turn, twice: the rows hear the table on
   the render after it drew. */
const settle = async (host: Updating): Promise<void> => {
  for (let round = 0; round < 3; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await host.updateComplete
    await Promise.all(rowsOf(host).map((row) => (row as Updating).updateComplete))
  }
}

const rowsOf = (host: HTMLElement): HTMLElement[] => [
  ...host.querySelectorAll<HTMLElement>('helix-headless-table-row'),
]

const make = async (attributes = 'reorderable'): Promise<Table> => {
  const host = (await mount(`
    <helix-headless-table label="Queue" ${attributes}>
      <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
      <helix-headless-table-column>Pages</helix-headless-table-column>
      <helix-headless-table-row value="a">
        <helix-headless-table-cell header>Alpha</helix-headless-table-cell>
        <helix-headless-table-cell>3</helix-headless-table-cell>
      </helix-headless-table-row>
      <helix-headless-table-row value="b">
        <helix-headless-table-cell header>Beta</helix-headless-table-cell>
        <helix-headless-table-cell>8</helix-headless-table-cell>
      </helix-headless-table-row>
      <helix-headless-table-row value="c">
        <helix-headless-table-cell header>Gamma</helix-headless-table-cell>
        <helix-headless-table-cell>1</helix-headless-table-cell>
      </helix-headless-table-row>
    </helix-headless-table>`)) as Table
  tables.push(host)
  await settle(host)
  return host
}

const gripCell = (row: HTMLElement): HTMLElement | null => part(row, 'grip') as HTMLElement | null
const button = (row: HTMLElement): HTMLButtonElement =>
  part(row, 'grip-button') as HTMLButtonElement

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

const click = (target: Element): void => {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
}

const spoken = async (host: Table): Promise<string> => {
  await settle(host)
  return part(host, 'live')?.textContent?.trim() ?? ''
}

const order = (host: HTMLElement): string[] =>
  rowsOf(host).map((row) => row.getAttribute('value') ?? '')

/** Answers each move as a page would, by putting the rows in the new order. */
const follow = (host: Table): Detail[] => {
  const heard: Detail[] = []
  host.addEventListener('helix-reorder', (event) => {
    const detail = (event as CustomEvent<Detail>).detail
    heard.push(detail)
    const byKey = new Map(rowsOf(host).map((row) => [row.getAttribute('value'), row]))
    host.append(...detail.keys.map((key) => byKey.get(key) as HTMLElement))
  })
  return heard
}

const template = (host: HTMLElement): string =>
  (part(host, 'table') as HTMLElement).getAttribute('style') ?? ''

describe('a table that does not reorder', () => {
  test('draws no grip cell, no grip heading, and no track for them', async () => {
    const host = await make('')
    expect(rowsOf(host).map((row) => gripCell(row))).toEqual([null, null, null])
    expect(part(host, 'grip-head')).toBeNull()
    expect(template(host)).not.toContain(': max-content')
  })
})

describe('a reorderable table', () => {
  test('leads each row with a grip cell holding a named button, under a named heading', async () => {
    const host = await make('reorderable selectable')
    const [alpha] = rowsOf(host) as [HTMLElement]
    expect(gripCell(alpha)?.getAttribute('role')).toBe('cell')
    expect(button(alpha).getAttribute('aria-label')).toBe('Move Alpha')
    expect(button(alpha).getAttribute('type')).toBe('button')
    const head = part(host, 'grip-head')
    expect(head?.getAttribute('role')).toBe('columnheader')
    expect(head?.getAttribute('aria-label')).toBe('Move rows')
    /* Before the checkbox column, in the heading and in each row. */
    expect(head?.nextElementSibling?.getAttribute('part')).toBe('select-all')
    expect(gripCell(alpha)?.nextElementSibling?.getAttribute('part')).toContain('select')
    expect(template(host)).toContain('--table-template: max-content max-content ')
  })

  test('picks up a row from its grip, moves it with the arrows, and drops it, asking first', async () => {
    const host = await make()
    const asked: Detail[] = []
    host.addEventListener('helix-before-reorder', (event) =>
      asked.push((event as CustomEvent<Detail>).detail),
    )
    const heard = follow(host)
    const [alpha, beta] = rowsOf(host) as [HTMLElement, HTMLElement]
    click(button(alpha))
    expect(await spoken(host)).toBe('Picked up Alpha')
    expect(hasState(alpha, 'dragging')).toBe(true)
    const down = press(button(alpha), 'ArrowDown')
    expect(down.defaultPrevented).toBe(true)
    expect(await spoken(host)).toBe('Alpha moved to position 2 of 3')
    expect(hasState(beta, 'drop-after')).toBe(true)
    click(button(alpha))
    await settle(host)
    const detail = { from: 0, key: 'a', keys: ['b', 'a', 'c'], kind: 'row', to: 1, value: 'b,a,c' }
    expect(asked).toEqual([detail])
    expect(heard).toEqual([detail])
    expect(order(host)).toEqual(['b', 'a', 'c'])
    expect(await spoken(host)).toBe('Dropped')
    expect(hasState(alpha, 'dragging')).toBe(false)
  })

  test('gives focus back to the moved row’s grip once the page has moved it', async () => {
    const host = await make()
    follow(host)
    const [alpha] = rowsOf(host) as [HTMLElement]
    button(alpha).focus()
    click(button(alpha))
    press(button(alpha), 'End')
    click(button(alpha))
    await settle(host)
    expect(order(host)).toEqual(['b', 'c', 'a'])
    expect(alpha.shadowRoot?.activeElement).toBe(button(alpha))
  })

  test('Escape puts the row back, and a click on another row drops it there', async () => {
    const host = await make()
    const heard = follow(host)
    const [alpha, , gamma] = rowsOf(host) as [HTMLElement, HTMLElement, HTMLElement]
    click(button(gamma))
    press(button(gamma), 'ArrowUp')
    press(button(gamma), 'Escape')
    expect(await spoken(host)).toBe('Canceled')
    expect(heard).toEqual([])
    click(button(gamma))
    click(alpha.querySelector('helix-headless-table-cell') as Element)
    expect(heard.map((one) => one.keys)).toEqual([['c', 'a', 'b']])
  })

  test('the grips do nothing while a sort decides the order', async () => {
    const host = await make()
    const heard = follow(host)
    host.sort = 'name:desc'
    await settle(host)
    const [first] = rowsOf(host) as [HTMLElement]
    expect(button(first).getAttribute('aria-disabled')).toBe('true')
    click(button(first))
    press(button(first), 'ArrowDown')
    click(button(first))
    expect(heard).toEqual([])
  })

  test('the words are the page’s to change', async () => {
    const host = await make(
      'reorderable picked-up-label="Holding {name}" move-row-label="Drag {row}"',
    )
    const [, beta] = rowsOf(host) as [HTMLElement, HTMLElement]
    expect(button(beta).getAttribute('aria-label')).toBe('Drag Beta')
    click(button(beta))
    expect(await spoken(host)).toBe('Holding Beta')
  })
})

describe('a reorderable grid table', () => {
  test('makes the grip a cell of the grid, ahead of the checkbox, that Enter picks up', async () => {
    const host = await make('reorderable selectable grid')
    const heard = follow(host)
    const [alpha] = rowsOf(host) as [HTMLElement]
    const cell = gripCell(alpha) as HTMLElement
    expect(cell.getAttribute('role')).toBe('gridcell')
    expect(button(alpha).getAttribute('tabindex')).toBe('-1')
    expect(part(host, 'grip-head')?.getAttribute('tabindex')).toBe('0')
    /* Right from the grip heading reaches the heading that selects every row. */
    press(part(host, 'grip-head') as Element, 'ArrowRight')
    await settle(host)
    expect(part(host, 'select-all')?.getAttribute('tabindex')).toBe('0')
    cell.focus()
    await settle(host)
    expect(cell.getAttribute('tabindex')).toBe('0')
    press(cell, 'Enter')
    expect(await spoken(host)).toBe('Picked up Alpha')
    press(cell, 'ArrowDown')
    press(cell, 'Enter')
    await settle(host)
    expect(heard.map((one) => one.keys)).toEqual([['b', 'a', 'c']])
    expect(alpha.shadowRoot?.activeElement).toBe(gripCell(alpha))
  })

  test('Space on a grip cell picks up the row and selects nothing', async () => {
    const host = await make('reorderable selectable grid')
    const [alpha] = rowsOf(host) as [HTMLElement]
    const cell = gripCell(alpha) as HTMLElement
    cell.focus()
    press(cell, ' ')
    expect(await spoken(host)).toBe('Picked up Alpha')
    expect((host as unknown as { selected: string }).selected).toBe('')
  })
})
